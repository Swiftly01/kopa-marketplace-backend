import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import {
  BedSummaryView,
  LodgeCardView,
  LodgeDetailView,
  LodgeManageView,
  PickupBatchView,
} from '../dtos/lodge-response.dto';
import { LodgeAssemblyGate } from '../entities/lodge-assembly-gate.entity';
import { LodgeBooking } from '../entities/lodge-booking.entity';
import { LodgeImage } from '../entities/lodge-image.entity';
import { LodgePickupBatch } from '../entities/lodge-pickup-batch.entity';
import { Lodge } from '../entities/lodge.entity';
import { ACTIVE_BOOKING_STATUSES } from '../enums/lodge.enums';
import {
  emptyBeds,
  toBatchView,
  toCardView,
  toDetailView,
  toManageView,
} from '../mappers/lodge.mapper';
import { LodgeBedSlotService } from './lodge-bed-slot.service';

// builds response shapes; read-only, so any service can use it without cycles
@Injectable()
export class LodgeViewService {
  constructor(
    @InjectRepository(LodgeImage)
    private readonly images: Repository<LodgeImage>,
    @InjectRepository(LodgePickupBatch)
    private readonly batches: Repository<LodgePickupBatch>,
    @InjectRepository(LodgeAssemblyGate)
    private readonly gates: Repository<LodgeAssemblyGate>,
    @InjectRepository(LodgeBooking)
    private readonly bookings: Repository<LodgeBooking>,
    private readonly bedSlots: LodgeBedSlotService,
  ) {}

  async manage(lodge: Lodge): Promise<LodgeManageView> {
    const parts = await this.loadParts(lodge);
    return toManageView(
      lodge,
      parts.images,
      parts.beds,
      parts.batches,
      parts.gates,
    );
  }

  async detail(lodge: Lodge): Promise<LodgeDetailView> {
    const parts = await this.loadParts(lodge);
    return toDetailView(
      lodge,
      parts.images,
      parts.beds,
      parts.batches,
      parts.gates,
    );
  }

  // list cards for one page of lodges with two extra queries, not one per lodge
  async cards(lodges: Lodge[]): Promise<LodgeCardView[]> {
    if (!lodges.length) return [];
    const ids = lodges.map((lodge) => lodge.id);
    const [covers, summaries, held] = await Promise.all([
      this.images.find({ where: { lodgeId: In(ids), isCover: true } }),
      this.bedSlots.summaries(ids),
      this.heldCounts(lodges.filter((lodge) => !lodge.bedSlotsEnabled)),
    ]);
    const coverByLodge = new Map(covers.map((cover) => [cover.lodgeId, cover]));
    return lodges.map((lodge) => {
      const beds = this.bedsFor(lodge, summaries.get(lodge.id), held);
      return toCardView(lodge, coverByLodge.get(lodge.id), {
        total: beds.total,
        available: beds.available,
      });
    });
  }

  async batchViews(lodgeId: string): Promise<PickupBatchView[]> {
    const batches = await this.batches.find({
      where: { lodgeId },
      relations: { gate: true },
      order: { position: 'ASC', createdAt: 'ASC' },
    });
    if (!batches.length) return [];

    const rows = await this.bookings
      .createQueryBuilder('booking')
      .select('booking.pickup_batch_id', 'batchId')
      .addSelect('COUNT(*)', 'count')
      .where('booking.pickup_batch_id IN (:...ids)', {
        ids: batches.map((batch) => batch.id),
      })
      .andWhere('booking.status IN (:...statuses)', {
        statuses: [...ACTIVE_BOOKING_STATUSES],
      })
      .groupBy('booking.pickup_batch_id')
      .getRawMany<{ batchId: string; count: string }>();
    const booked = new Map(rows.map((row) => [row.batchId, Number(row.count)]));

    return batches.map((batch) => toBatchView(batch, booked.get(batch.id) ?? 0));
  }

  private async loadParts(lodge: Lodge) {
    const lodgeId = lodge.id;
    const [images, batches, gates, summaries, held] = await Promise.all([
      this.images.find({ where: { lodgeId }, order: { position: 'ASC' } }),
      this.batchViews(lodgeId),
      this.gates.find({ where: { lodgeId }, order: { position: 'ASC' } }),
      this.bedSlots.summaries([lodgeId]),
      this.heldCounts(lodge.bedSlotsEnabled ? [] : [lodge]),
    ]);
    return {
      images,
      batches,
      gates,
      beds: this.bedsFor(lodge, summaries.get(lodgeId), held),
    };
  }

  // without bed slots the optional capacity is the only limit; no cap means nothing to count
  private bedsFor(
    lodge: Lodge,
    summary: BedSummaryView | undefined,
    held: Map<string, number>,
  ): BedSummaryView {
    if (lodge.bedSlotsEnabled) return summary ?? emptyBeds();
    const total = lodge.capacity ?? 0;
    const taken = held.get(lodge.id) ?? 0;
    return {
      ...emptyBeds(),
      total,
      available: Math.max(0, total - taken),
      occupied: Math.min(taken, total),
    };
  }

  // active bookings per lodge, only needed for lodges that do not track beds
  private async heldCounts(lodges: Lodge[]): Promise<Map<string, number>> {
    if (!lodges.length) return new Map();
    const rows = await this.bookings
      .createQueryBuilder('booking')
      .select('booking.lodge_id', 'lodgeId')
      .addSelect('COUNT(*)', 'count')
      .where('booking.lodge_id IN (:...ids)', { ids: lodges.map((l) => l.id) })
      .andWhere('booking.status IN (:...statuses)', {
        statuses: [...ACTIVE_BOOKING_STATUSES],
      })
      .groupBy('booking.lodge_id')
      .getRawMany<{ lodgeId: string; count: string }>();
    return new Map(rows.map((row) => [row.lodgeId, Number(row.count)]));
  }
}
