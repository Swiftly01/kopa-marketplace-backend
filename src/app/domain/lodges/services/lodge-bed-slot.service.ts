import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, In, Repository } from 'typeorm';
import { MAX_LODGE_BED_SLOTS } from '../constants/lodge.constants';
import {
  CreateBedSlotDto,
  GenerateBedSlotsDto,
  UpdateBedSlotDto,
} from '../dtos/lodge-setup.dto';
import { BedSlotView, BedSummaryView } from '../dtos/lodge-response.dto';
import { LodgeBedSlot } from '../entities/lodge-bed-slot.entity';
import { LodgeBooking } from '../entities/lodge-booking.entity';
import { LodgeRoom } from '../entities/lodge-room.entity';
import { Lodge } from '../entities/lodge.entity';
import {
  ACTIVE_BOOKING_STATUSES,
  BedSlotStatus,
  BedWing,
  BunkType,
  InventoryMode,
  WING_CODE_PREFIX,
} from '../enums/lodge.enums';
import { emptyBeds, toBedSlotView } from '../mappers/lodge.mapper';
import { LodgeScope } from '../utils/lodge-scope';
import { LodgeAccessService } from './lodge-access.service';

const pad = (value: number) => String(value).padStart(2, '0');

@Injectable()
export class LodgeBedSlotService {
  constructor(
    @InjectRepository(LodgeBedSlot)
    private readonly slots: Repository<LodgeBedSlot>,
    private readonly dataSource: DataSource,
    private readonly access: LodgeAccessService,
  ) {}

  // counts per lodge, split by wing and status, in one grouped query
  async summaries(lodgeIds: string[]): Promise<Map<string, BedSummaryView>> {
    const result = new Map<string, BedSummaryView>();
    lodgeIds.forEach((id) => result.set(id, emptyBeds()));
    if (!lodgeIds.length) return result;

    const rows = await this.slots
      .createQueryBuilder('slot')
      .select('slot.lodge_id', 'lodgeId')
      .addSelect('slot.wing', 'wing')
      .addSelect('slot.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .where('slot.lodge_id IN (:...lodgeIds)', { lodgeIds })
      .groupBy('slot.lodge_id')
      .addGroupBy('slot.wing')
      .addGroupBy('slot.status')
      .getRawMany<{
        lodgeId: string;
        wing: BedWing;
        status: BedSlotStatus;
        count: string;
      }>();

    for (const row of rows) {
      const summary = result.get(row.lodgeId);
      if (!summary) continue;
      const count = Number(row.count);
      const wing = summary.wings[row.wing];
      const key =
        row.status === BedSlotStatus.AVAILABLE
          ? 'available'
          : row.status === BedSlotStatus.IN_TRANSIT
            ? 'inTransit'
            : row.status === BedSlotStatus.HELD
              ? 'held'
              : 'occupied';
      for (const target of [summary, wing]) {
        target.total += count;
        target[key] += count;
      }
    }
    return result;
  }

  async list(
    scope: LodgeScope,
    lodgeId: string,
  ): Promise<{ beds: BedSummaryView; slots: BedSlotView[] }> {
    await this.access.find(lodgeId, scope);
    const [slots, summaries] = await Promise.all([
      this.slots.find({
        where: { lodgeId },
        order: { wing: 'ASC', code: 'ASC' },
      }),
      this.summaries([lodgeId]),
    ]);
    return {
      beds: summaries.get(lodgeId) ?? emptyBeds(),
      slots: slots.map(toBedSlotView),
    };
  }

  // free beds a corper can pick from (caller has already checked the lodge is live)
  async listAvailable(lodgeId: string, wing?: BedWing): Promise<BedSlotView[]> {
    const slots = await this.slots.find({
      where: {
        lodgeId,
        status: BedSlotStatus.AVAILABLE,
        ...(wing ? { wing } : {}),
      },
      order: { wing: 'ASC', code: 'ASC' },
    });
    return slots.map(toBedSlotView);
  }

  async create(
    scope: LodgeScope,
    lodgeId: string,
    dto: CreateBedSlotDto,
  ): Promise<BedSlotView> {
    return this.dataSource.transaction(async (manager) => {
      const lodge = await this.access.find(lodgeId, scope, manager, true);
      this.assertTracksBeds(lodge);
      if (lodge.inventoryMode === InventoryMode.ROOM_BASED && !dto.roomId) {
        throw new BadRequestException('Pick a room: this lodge allocates by room');
      }
      if (dto.roomId) await this.findRoom(manager, lodgeId, dto.roomId);
      await this.assertRoom(manager, lodgeId, 1);
      const [number] = await this.nextNumbers(manager, lodgeId, dto.wing, 1);
      const slot = await manager.save(
        manager.create(LodgeBedSlot, {
          lodgeId,
          roomId: dto.roomId ?? null,
          code: `${WING_CODE_PREFIX[dto.wing]}-${pad(number)}`,
          wing: dto.wing,
          bunkType: dto.bunkType,
          locationNote: dto.locationNote ?? null,
        }),
      );
      return toBedSlotView(slot);
    });
  }

  // appends numbered slots, odd numbers lower bunks and even numbers upper bunks
  async generate(
    scope: LodgeScope,
    lodgeId: string,
    dto: GenerateBedSlotsDto,
  ): Promise<BedSlotView[]> {
    const total = dto.maleCount + dto.femaleCount;
    if (total === 0) {
      throw new BadRequestException('Nothing to generate');
    }

    return this.dataSource.transaction(async (manager) => {
      const lodge = await this.access.find(lodgeId, scope, manager, true);
      this.assertTracksBeds(lodge);
      await this.assertRoom(manager, lodgeId, total);

      const created: LodgeBedSlot[] = [];
      for (const [wing, count] of [
        [BedWing.MALE, dto.maleCount],
        [BedWing.FEMALE, dto.femaleCount],
      ] as const) {
        const numbers = await this.nextNumbers(manager, lodgeId, wing, count);
        numbers.forEach((number) =>
          created.push(
            manager.create(LodgeBedSlot, {
              lodgeId,
              code: `${WING_CODE_PREFIX[wing]}-${pad(number)}`,
              wing,
              bunkType: number % 2 === 1 ? BunkType.LOWER : BunkType.UPPER,
              locationNote: null,
            }),
          ),
        );
      }
      const saved = await manager.save(created);
      return saved.map(toBedSlotView);
    });
  }

  async update(
    scope: LodgeScope,
    lodgeId: string,
    slotId: string,
    dto: UpdateBedSlotDto,
  ): Promise<BedSlotView> {
    return this.dataSource.transaction(async (manager) => {
      await this.access.find(lodgeId, scope, manager, true);
      const slot = await this.findSlot(manager, lodgeId, slotId);

      if (dto.roomId !== undefined) {
        if (dto.roomId) await this.findRoom(manager, lodgeId, dto.roomId);
        slot.roomId = dto.roomId;
      }
      if (dto.bunkType !== undefined) slot.bunkType = dto.bunkType;
      if (dto.locationNote !== undefined) slot.locationNote = dto.locationNote;

      if (dto.status !== undefined || dto.occupantLabel !== undefined) {
        // beds held by a booking change through the booking, never by hand
        if (await this.hasActiveBooking(manager, slot.id)) {
          throw new ConflictException(
            'This bed is held by a booking. Manage it from the bookings list',
          );
        }
        if (dto.status === BedSlotStatus.IN_TRANSIT) {
          throw new BadRequestException(
            'Only available, occupied or held can be set by hand',
          );
        }
        if (dto.status !== undefined) slot.status = dto.status;
        if (dto.occupantLabel !== undefined) {
          slot.occupantLabel = dto.occupantLabel;
        }
        if (slot.status === BedSlotStatus.AVAILABLE) slot.occupantLabel = null;
      }

      return toBedSlotView(await manager.save(slot));
    });
  }

  async remove(
    scope: LodgeScope,
    lodgeId: string,
    slotId: string,
  ): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      await this.access.find(lodgeId, scope, manager, true);
      const slot = await this.findSlot(manager, lodgeId, slotId);
      if (
        slot.status !== BedSlotStatus.AVAILABLE ||
        (await this.hasActiveBooking(manager, slot.id))
      ) {
        throw new ConflictException('Only an unbooked, available bed can be removed');
      }
      await manager.delete(LodgeBedSlot, { id: slot.id });
    });
  }

  // used by the booking flow, always inside its transaction
  async releaseSlot(manager: EntityManager, slotId: string | null): Promise<void> {
    if (!slotId) return;
    await manager.update(
      LodgeBedSlot,
      { id: slotId, status: In([BedSlotStatus.IN_TRANSIT, BedSlotStatus.OCCUPIED]) },
      { status: BedSlotStatus.AVAILABLE, occupantLabel: null },
    );
  }

  private async findRoom(
    manager: EntityManager,
    lodgeId: string,
    roomId: string,
  ): Promise<void> {
    const room = await manager.findOne(LodgeRoom, { where: { id: roomId, lodgeId } });
    if (!room) {
      throw new NotFoundException('Room not found');
    }
  }

  private assertTracksBeds(lodge: Lodge): void {
    if (!lodge.bedSlotsEnabled) {
      throw new ConflictException(
        'This lodge does not track individual beds. Turn bed slots on first',
      );
    }
  }

  private async findSlot(
    manager: EntityManager,
    lodgeId: string,
    slotId: string,
  ): Promise<LodgeBedSlot> {
    const slot = await manager.findOne(LodgeBedSlot, {
      where: { id: slotId, lodgeId },
    });
    if (!slot) {
      throw new NotFoundException('Bed slot not found');
    }
    return slot;
  }

  private async hasActiveBooking(
    manager: EntityManager,
    slotId: string,
  ): Promise<boolean> {
    const count = await manager.count(LodgeBooking, {
      where: { bedSlotId: slotId, status: In([...ACTIVE_BOOKING_STATUSES]) },
    });
    return count > 0;
  }

  private async assertRoom(
    manager: EntityManager,
    lodgeId: string,
    incoming: number,
  ): Promise<void> {
    const existing = await manager.count(LodgeBedSlot, { where: { lodgeId } });
    if (existing + incoming > MAX_LODGE_BED_SLOTS) {
      throw new BadRequestException(
        `A lodge can have at most ${MAX_LODGE_BED_SLOTS} bed slots (you have ${existing})`,
      );
    }
  }

  // continues numbering after the highest existing code of that wing
  private async nextNumbers(
    manager: EntityManager,
    lodgeId: string,
    wing: BedWing,
    count: number,
  ): Promise<number[]> {
    const existing = await manager.find(LodgeBedSlot, {
      where: { lodgeId, wing },
      select: { code: true },
    });
    const highest = existing.reduce(
      (max, slot) => Math.max(max, Number(slot.code.split('-')[1]) || 0),
      0,
    );
    return Array.from({ length: count }, (_, index) => highest + index + 1);
  }
}
