import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { UpdateMyBookingDto } from '../dtos/lodge-booking.dto';
import { BookingView } from '../dtos/lodge-response.dto';
import { LodgeBedSlot } from '../entities/lodge-bed-slot.entity';
import { LodgeBooking } from '../entities/lodge-booking.entity';
import { Lodge } from '../entities/lodge.entity';
import {
  BedSlotStatus,
  CorperGender,
  WING_BY_GENDER,
} from '../enums/lodge.enums';
import {
  changedScalars,
  EditableField,
  lockedFieldsSent,
  sentFields,
  toPatch,
} from '../utils/booking-edit.util';
import { translateBookingConflict } from '../utils/booking-conflict.util';
import { shortName } from '../utils/short-name.util';
import { LodgeBedSlotService } from './lodge-bed-slot.service';
import { LodgeBookingRulesService } from './lodge-booking-rules.service';
import { LodgeBookingService } from './lodge-booking.service';
import { LodgeNotifyService } from './lodge-notify.service';

interface EditOutcome {
  changed: boolean;
  adminUserId: string | null;
}

// a corper changing what they submitted: details, bed and pickup, all in one transaction
@Injectable()
export class LodgeBookingEditService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly rules: LodgeBookingRulesService,
    private readonly bedSlots: LodgeBedSlotService,
    private readonly notifier: LodgeNotifyService,
    private readonly bookings: LodgeBookingService,
  ) {}

  async update(
    userId: string,
    id: string,
    dto: UpdateMyBookingDto,
  ): Promise<BookingView> {
    const sent = sentFields(dto);
    if (!sent.length) {
      throw new BadRequestException('Send at least one field to update');
    }

    let outcome: EditOutcome;
    try {
      outcome = await this.dataSource.transaction((manager) =>
        this.apply(manager, userId, id, dto, sent),
      );
    } catch (error) {
      throw translateBookingConflict(error);
    }

    if (outcome.changed) {
      await this.notifier.send(outcome.adminUserId, {
        title: 'Lodge booking updated',
        body: 'A corper changed the details of their bed request.',
        data: { bookingId: id },
      });
    }
    return this.bookings.getMine(userId, id);
  }

  // ---- internals ----

  private async apply(
    manager: EntityManager,
    userId: string,
    id: string,
    dto: UpdateMyBookingDto,
    sent: EditableField[],
  ): Promise<EditOutcome> {
    const booking = await this.rules.lockEditable(manager, userId, id);
    const locked = lockedFieldsSent(booking.status, sent);
    if (locked.length) {
      throw new ConflictException(
        `${locked.join(', ')} cannot be changed after the booking is confirmed`,
      );
    }

    const lodge = await manager.findOneOrFail(Lodge, {
      where: { id: booking.lodgeId },
      relations: { familyHouse: true },
      withDeleted: true,
    });
    const patch = toPatch(dto, sent);
    const scalarsChanged = changedScalars(booking, patch).length > 0;

    const bedChanged = await this.syncBed(manager, booking, lodge, dto, patch);
    const pickupChanged = await this.syncPickup(manager, booking, lodge, dto);

    const changed = scalarsChanged || bedChanged || pickupChanged;
    if (changed) {
      Object.assign(booking, patch);
      await manager.save(booking);
    }
    return { changed, adminUserId: lodge.familyHouse?.adminUserId ?? null };
  }

  // moves to a new free bed, or keeps the held bed consistent with the new name and gender
  private async syncBed(
    manager: EntityManager,
    booking: LodgeBooking,
    lodge: Lodge,
    dto: UpdateMyBookingDto,
    patch: { fullName?: string; gender?: CorperGender },
  ): Promise<boolean> {
    const gender = patch.gender ?? booking.gender;
    const label = shortName(patch.fullName ?? booking.fullName);

    if (dto.bedSlotId && !lodge.bedSlotsEnabled) {
      throw new BadRequestException(
        'This lodge does not assign individual beds',
      );
    }

    if (dto.bedSlotId && dto.bedSlotId !== booking.bedSlotId) {
      const slot = await manager.findOne(LodgeBedSlot, {
        where: { id: dto.bedSlotId, lodgeId: lodge.id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!slot) {
        throw new NotFoundException('Bed slot not found');
      }
      this.assertWing(slot, gender);
      if (slot.status !== BedSlotStatus.AVAILABLE) {
        throw new ConflictException(
          'This bed is no longer available. Pick another one',
        );
      }
      slot.status = BedSlotStatus.IN_TRANSIT;
      slot.occupantLabel = label;
      await manager.save(slot);
      await this.bedSlots.releaseSlot(manager, booking.bedSlotId);
      booking.bedSlotId = slot.id;
      return true;
    }

    if (!booking.bedSlotId) return false;
    const held = await manager.findOneByOrFail(LodgeBedSlot, {
      id: booking.bedSlotId,
    });
    if (held.wing !== WING_BY_GENDER[gender]) {
      throw new BadRequestException(
        `Changing gender needs a bed in the ${WING_BY_GENDER[gender]} wing. Send a new bedSlotId`,
      );
    }
    if (held.occupantLabel === label) return false;
    await manager.update(
      LodgeBedSlot,
      { id: held.id },
      { occupantLabel: label },
    );
    return false;
  }

  private async syncPickup(
    manager: EntityManager,
    booking: LodgeBooking,
    lodge: Lodge,
    dto: UpdateMyBookingDto,
  ): Promise<boolean> {
    const { pickupBatchId: batchId, pickupGateId: gateId } = dto;
    if ((batchId || gateId) && !lodge.pickupEnabled) {
      throw new BadRequestException('This lodge does not offer camp pickup');
    }
    const batchChanged =
      batchId !== undefined && batchId !== booking.pickupBatchId;
    const gateChanged = gateId !== undefined && gateId !== booking.pickupGateId;
    if (!batchChanged && !gateChanged) return false;

    await this.rules.claimPickup(manager, lodge.id, {
      batchId: batchChanged ? batchId : null,
      gateId: gateChanged ? gateId : null,
    });
    if (batchChanged) booking.pickupBatchId = batchId ?? null;
    if (gateChanged) booking.pickupGateId = gateId ?? null;
    return true;
  }

  private assertWing(slot: LodgeBedSlot, gender: CorperGender): void {
    if (slot.wing !== WING_BY_GENDER[gender]) {
      throw new BadRequestException(
        `This bed is in the ${slot.wing} wing and does not match the selected gender`,
      );
    }
  }
}
