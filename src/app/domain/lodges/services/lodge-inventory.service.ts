import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, In, IsNull, Not, Repository } from 'typeorm';
import {
  InventoryRoomView,
  InventorySlotView,
  InventoryView,
  SlotOccupantView,
} from '../dtos/lodge-ops-response.dto';
import { BookingView } from '../dtos/lodge-response.dto';
import { LodgeBedSlot } from '../entities/lodge-bed-slot.entity';
import { LodgeBooking } from '../entities/lodge-booking.entity';
import { LodgeRoom } from '../entities/lodge-room.entity';
import {
  ACTIVE_BOOKING_STATUSES,
  BedSlotStatus,
  BookingStatus,
  WING_BY_GENDER,
} from '../enums/lodge.enums';
import {
  emptyWing,
  toBedSlotView,
  toRoomView,
} from '../mappers/lodge.mapper';
import { LodgeScope } from '../utils/lodge-scope';
import { LodgeAccessService } from './lodge-access.service';
import { LodgeBookingService } from './lodge-booking.service';

const active = () => In([...ACTIVE_BOOKING_STATUSES]);

// the room-by-room board, and placing corpers on beds
@Injectable()
export class LodgeInventoryService {
  constructor(
    @InjectRepository(LodgeRoom) private readonly rooms: Repository<LodgeRoom>,
    @InjectRepository(LodgeBedSlot)
    private readonly slots: Repository<LodgeBedSlot>,
    @InjectRepository(LodgeBooking)
    private readonly bookings: Repository<LodgeBooking>,
    private readonly dataSource: DataSource,
    private readonly access: LodgeAccessService,
    private readonly bookingService: LodgeBookingService,
  ) {}

  async get(scope: LodgeScope, lodgeId: string): Promise<InventoryView> {
    const lodge = await this.access.find(lodgeId, scope);
    const [rooms, slots, held, unassigned] = await Promise.all([
      this.rooms.find({ where: { lodgeId }, order: { position: 'ASC' } }),
      this.slots.find({ where: { lodgeId }, order: { code: 'ASC' } }),
      this.bookings.find({
        where: { lodgeId, status: active(), bedSlotId: Not(IsNull()) },
      }),
      this.bookings.find({
        where: { lodgeId, status: active(), bedSlotId: IsNull() },
        order: { createdAt: 'ASC' },
      }),
    ]);

    const bookingBySlot = new Map(held.map((booking) => [booking.bedSlotId, booking]));
    const slotViews: InventorySlotView[] = slots.map((slot) => ({
      ...toBedSlotView(slot),
      occupant: this.occupantOf(slot, bookingBySlot.get(slot.id)),
    }));

    const roomViews: InventoryRoomView[] = rooms.map((room) => {
      const own = slotViews.filter((slot) => slot.roomId === room.id);
      const summary = emptyWing();
      own.forEach((slot) => this.count(summary, slot.status));
      return { ...toRoomView(room), summary, slots: own };
    });

    const total = emptyWing();
    slotViews.forEach((slot) => this.count(total, slot.status));
    const reserved = total.inTransit + total.occupied;

    return {
      mode: lodge.inventoryMode,
      bedSlotsEnabled: lodge.bedSlotsEnabled,
      stats: {
        totalCapacity: total.total,
        roomCount: rooms.length,
        occupiedAndReserved: reserved,
        fillRatePercent: total.total
          ? Math.round((reserved / total.total) * 1000) / 10
          : 0,
        available: total.available,
        held: total.held,
      },
      rooms: roomViews,
      looseSlots: slotViews.filter((slot) => !slot.roomId),
      unassigned: unassigned.map((booking) => ({
        bookingId: booking.id,
        fullName: booking.fullName,
        gender: booking.gender,
        callUpNumber: booking.callUpNumber,
        status: booking.status,
        registeredAt: booking.createdAt,
      })),
    };
  }

  // places or moves one corper; frees the previous bed in the same transaction
  async assignBed(
    scope: LodgeScope,
    bookingId: string,
    bedSlotId: string,
  ): Promise<BookingView> {
    await this.dataSource.transaction(async (manager) => {
      const booking = await manager.findOne(LodgeBooking, {
        where: {
          id: bookingId,
          ...(scope.familyHouseId ? { familyHouseId: scope.familyHouseId } : {}),
        },
        lock: { mode: 'pessimistic_write' },
      });
      if (!booking) {
        throw new NotFoundException('Booking not found');
      }
      if (!ACTIVE_BOOKING_STATUSES.includes(booking.status)) {
        throw new ConflictException(`A ${booking.status} booking cannot be given a bed`);
      }
      if (booking.bedSlotId === bedSlotId) return;

      const slot = await manager.findOne(LodgeBedSlot, {
        where: { id: bedSlotId, lodgeId: booking.lodgeId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!slot) {
        throw new NotFoundException('Bed slot not found');
      }
      this.assertFits(slot, booking);

      const previous = booking.bedSlotId;
      booking.bedSlotId = slot.id;
      await manager.save(booking);
      await this.bookSlot(manager, slot, booking);
      if (previous) {
        await manager.update(
          LodgeBedSlot,
          { id: previous },
          { status: BedSlotStatus.AVAILABLE, occupantLabel: null },
        );
      }
    });
    return this.bookingService.get(scope, bookingId);
  }

  // "Auto-Distribute by Gender Wing": waiting corpers, first come first placed
  async autoAssign(
    scope: LodgeScope,
    lodgeId: string,
  ): Promise<{ assigned: number; stillWaiting: number }> {
    return this.dataSource.transaction(async (manager) => {
      await this.access.find(lodgeId, scope, manager, true);
      const waiting = await manager.find(LodgeBooking, {
        where: { lodgeId, status: active(), bedSlotId: IsNull() },
        order: { createdAt: 'ASC' },
      });
      const free = await manager.find(LodgeBedSlot, {
        where: { lodgeId, status: BedSlotStatus.AVAILABLE },
        order: { code: 'ASC' },
        lock: { mode: 'pessimistic_write' },
      });

      let assigned = 0;
      for (const booking of waiting) {
        const wing = WING_BY_GENDER[booking.gender];
        const index = free.findIndex((slot) => slot.wing === wing);
        if (index === -1) continue;
        const [slot] = free.splice(index, 1);
        booking.bedSlotId = slot.id;
        await manager.save(booking);
        await this.bookSlot(manager, slot, booking);
        assigned += 1;
      }
      return { assigned, stillWaiting: waiting.length - assigned };
    });
  }

  private assertFits(slot: LodgeBedSlot, booking: LodgeBooking): void {
    if (slot.wing !== WING_BY_GENDER[booking.gender]) {
      throw new BadRequestException(
        `This bed is in the ${slot.wing} wing and does not match the corper's gender`,
      );
    }
    if (slot.status !== BedSlotStatus.AVAILABLE) {
      throw new ConflictException('This bed is not available');
    }
  }

  // an admitted corper's bed is occupied; anyone else's is reserved (in transit)
  private async bookSlot(
    manager: EntityManager,
    slot: LodgeBedSlot,
    booking: LodgeBooking,
  ): Promise<void> {
    slot.status =
      booking.status === BookingStatus.CHECKED_IN
        ? BedSlotStatus.OCCUPIED
        : BedSlotStatus.IN_TRANSIT;
    slot.occupantLabel = this.shortName(booking.fullName);
    await manager.save(slot);
  }

  private occupantOf(
    slot: LodgeBedSlot,
    booking: LodgeBooking | undefined,
  ): SlotOccupantView | null {
    if (booking) {
      return {
        bookingId: booking.id,
        name: booking.fullName,
        status: booking.status,
        documentsVerified: booking.documentsVerifiedAt !== null,
      };
    }
    // hand-marked occupied or held beds only carry a label
    return slot.occupantLabel
      ? {
          bookingId: null,
          name: slot.occupantLabel,
          status: null,
          documentsVerified: false,
        }
      : null;
  }

  private count(summary: ReturnType<typeof emptyWing>, status: BedSlotStatus): void {
    summary.total += 1;
    if (status === BedSlotStatus.AVAILABLE) summary.available += 1;
    else if (status === BedSlotStatus.IN_TRANSIT) summary.inTransit += 1;
    else if (status === BedSlotStatus.HELD) summary.held += 1;
    else summary.occupied += 1;
  }

  private shortName(fullName: string): string {
    const [first, second] = fullName.trim().split(/\s+/);
    return second ? `${first} ${second[0].toUpperCase()}.` : first;
  }
}
