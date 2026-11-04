import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import {
  TransitBatchView,
  TransitDashboardView,
  TransitGateView,
} from '../dtos/lodge-ops-response.dto';
import { BookingView } from '../dtos/lodge-response.dto';
import { LodgeAssemblyGate } from '../entities/lodge-assembly-gate.entity';
import { LodgeBooking } from '../entities/lodge-booking.entity';
import { LodgePickupBatch } from '../entities/lodge-pickup-batch.entity';
import {
  ACTIVE_BOOKING_STATUSES,
  BatchStatus,
  TransitStatus,
} from '../enums/lodge.enums';
import { toGateView } from '../mappers/lodge.mapper';
import { LodgeScope } from '../utils/lodge-scope';
import { LodgeAccessService } from './lodge-access.service';
import { LodgeBookingService } from './lodge-booking.service';
import { LodgeMessagingService } from './lodge-messaging.service';
import { LodgeViewService } from './lodge-view.service';

interface TransitRow {
  batchId: string;
  gateId: string | null;
  transit: TransitStatus;
  count: string;
}

// the pickup logistics board: who is where between camp and lodge
@Injectable()
export class LodgeTransitService {
  constructor(
    @InjectRepository(LodgeBooking)
    private readonly bookings: Repository<LodgeBooking>,
    @InjectRepository(LodgeAssemblyGate)
    private readonly gates: Repository<LodgeAssemblyGate>,
    private readonly dataSource: DataSource,
    private readonly access: LodgeAccessService,
    private readonly views: LodgeViewService,
    private readonly bookingService: LodgeBookingService,
    private readonly messaging: LodgeMessagingService,
  ) {}

  async dashboard(
    scope: LodgeScope,
    lodgeId: string,
  ): Promise<TransitDashboardView> {
    const lodge = await this.access.find(lodgeId, scope);
    const statuses = [...ACTIVE_BOOKING_STATUSES];

    const [gates, batches, rows, totalActive, wait] = await Promise.all([
      this.gates.find({ where: { lodgeId }, order: { position: 'ASC' } }),
      this.views.batchViews(lodgeId),
      this.bookings
        .createQueryBuilder('booking')
        .select('booking.pickup_batch_id', 'batchId')
        .addSelect('booking.pickup_gate_id', 'gateId')
        .addSelect('booking.transit_status', 'transit')
        .addSelect('COUNT(*)', 'count')
        .where('booking.lodge_id = :lodgeId', { lodgeId })
        .andWhere('booking.status IN (:...statuses)', { statuses })
        .andWhere('booking.pickup_batch_id IS NOT NULL')
        .groupBy('booking.pickup_batch_id')
        .addGroupBy('booking.pickup_gate_id')
        .addGroupBy('booking.transit_status')
        .getRawMany<TransitRow>(),
      this.bookings.count({ where: { lodgeId, status: In(statuses) } }),
      this.bookings
        .createQueryBuilder('booking')
        .select(
          'AVG(EXTRACT(EPOCH FROM (now() - booking.gate_arrived_at)) / 60)',
          'minutes',
        )
        .where('booking.lodge_id = :lodgeId', { lodgeId })
        .andWhere('booking.status IN (:...statuses)', { statuses })
        .andWhere('booking.transit_status = :atGate', {
          atGate: TransitStatus.AT_GATE,
        })
        .getRawOne<{ minutes: string | null }>(),
    ]);

    const sumWhere = (match: (row: TransitRow) => boolean) =>
      rows.filter(match).reduce((total, row) => total + Number(row.count), 0);
    const batchById = new Map(batches.map((batch) => [batch.id, batch]));

    const batchViews: TransitBatchView[] = batches.map((batch) => ({
      ...batch,
      atGate: sumWhere(
        (row) =>
          row.batchId === batch.id && row.transit === TransitStatus.AT_GATE,
      ),
      boarded: sumWhere(
        (row) =>
          row.batchId === batch.id && row.transit === TransitStatus.BOARDED,
      ),
      arrived: sumWhere(
        (row) =>
          row.batchId === batch.id && row.transit === TransitStatus.ARRIVED,
      ),
    }));

    const gateViews: TransitGateView[] = gates.map((gate) => ({
      ...toGateView(gate),
      registered: sumWhere((row) => row.gateId === gate.id),
      waiting: sumWhere(
        (row) =>
          row.gateId === gate.id && row.transit === TransitStatus.AT_GATE,
      ),
    }));

    return {
      stats: {
        corpersOptedForTransit: sumWhere(() => true),
        totalActiveCorpers: totalActive,
        atGate: sumWhere((row) => row.transit === TransitStatus.AT_GATE),
        avgWaitMinutes: Math.round(Number(wait?.minutes ?? 0)),
        // on board a trip that has left the gate
        inTransit: sumWhere(
          (row) =>
            row.transit === TransitStatus.BOARDED &&
            batchById.get(row.batchId)?.status === BatchStatus.IN_TRANSIT,
        ),
        arrivedAtLodge: sumWhere(
          (row) => row.transit === TransitStatus.ARRIVED,
        ),
        vehicles: batches.filter(
          (batch) =>
            batch.vehicleName && batch.status !== BatchStatus.CANCELLED,
        ).length,
      },
      gates: gateViews,
      batches: batchViews,
      corridor: lodge.transitInfo,
      logisticsLead: {
        name: lodge.logisticsLeadName,
        phone: lodge.logisticsLeadPhone,
      },
      date: lodge.pickupDate,
    };
  }

  // "Board Bus", "Mark Arrived", or noting that the corper is waiting at the gate
  async setTransit(
    scope: LodgeScope,
    bookingId: string,
    next: TransitStatus,
  ): Promise<BookingView> {
    await this.dataSource.transaction(async (manager) => {
      const booking = await manager.findOne(LodgeBooking, {
        where: {
          id: bookingId,
          ...(scope.familyHouseId
            ? { familyHouseId: scope.familyHouseId }
            : {}),
        },
        lock: { mode: 'pessimistic_write' },
      });
      if (!booking) {
        throw new NotFoundException('Booking not found');
      }
      if (!ACTIVE_BOOKING_STATUSES.includes(booking.status)) {
        throw new ConflictException(
          `A ${booking.status} booking is not in transit`,
        );
      }
      if (!booking.pickupBatchId) {
        throw new ConflictException('This corper did not choose camp pickup');
      }
      const batch = await manager.findOneByOrFail(LodgePickupBatch, {
        id: booking.pickupBatchId,
      });
      if (batch.status === BatchStatus.CANCELLED) {
        throw new ConflictException('This pickup trip was cancelled');
      }

      const now = new Date();
      const current = booking.transitStatus;
      if (next === TransitStatus.AT_GATE) {
        if (current !== TransitStatus.AWAITING) {
          throw new ConflictException(`Already ${current}`);
        }
        booking.gateArrivedAt = now;
      } else if (next === TransitStatus.BOARDED) {
        if (
          current !== TransitStatus.AWAITING &&
          current !== TransitStatus.AT_GATE
        ) {
          throw new ConflictException(`Already ${current}`);
        }
        if (
          batch.status !== BatchStatus.SCHEDULED &&
          batch.status !== BatchStatus.BOARDING
        ) {
          throw new ConflictException('This trip has already left the gate');
        }
        booking.boardedAt = now;
      } else {
        if (current !== TransitStatus.BOARDED) {
          throw new ConflictException(
            'Only a corper on board can be marked arrived',
          );
        }
        booking.arrivedAt = now;
      }
      booking.transitStatus = next;
      await manager.save(booking);
    });
    return this.bookingService.get(scope, bookingId);
  }

  // "Alert Riders": a message to everyone still booked on a trip
  async alertBatch(
    scope: LodgeScope,
    lodgeId: string,
    batchId: string,
    message: string,
  ): Promise<{ recipients: number; notified: number }> {
    const lodge = await this.access.find(lodgeId, scope);
    const batch = await this.dataSource.manager.findOne(LodgePickupBatch, {
      where: { id: batchId, lodgeId },
    });
    if (!batch) {
      throw new NotFoundException('Pickup batch not found');
    }
    const riders = await this.bookings.find({
      where: {
        pickupBatchId: batch.id,
        status: In([...ACTIVE_BOOKING_STATUSES]),
      },
      select: { id: true, corperId: true, transitStatus: true },
    });
    const userIds = riders
      .filter((rider) => rider.transitStatus !== TransitStatus.ARRIVED)
      .flatMap((rider) => (rider.corperId ? [rider.corperId] : []));
    const notified = await this.messaging.toCorpers(userIds, {
      title: `${lodge.name}: ${batch.label}`,
      body: message,
      data: { lodgeId, batchId },
    });
    return { recipients: userIds.length, notified };
  }
}
