import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, IsNull, Repository } from 'typeorm';
import { BroadcastDto } from '../dtos/lodge-desk.dto';
import { BookingManageQueryDto } from '../dtos/lodge-query.dto';
import { DeskSummaryView } from '../dtos/lodge-ops-response.dto';
import { BookingView } from '../dtos/lodge-response.dto';
import { LodgeBookingDocument } from '../entities/lodge-booking-document.entity';
import { LodgeBooking } from '../entities/lodge-booking.entity';
import {
  ACTIVE_BOOKING_STATUSES,
  BookingStatus,
  CorperGender,
} from '../enums/lodge.enums';
import { toCsv } from '../utils/csv.util';
import { LodgeScope } from '../utils/lodge-scope';
import { LodgeAccessService } from './lodge-access.service';
import { LodgeBedSlotService } from './lodge-bed-slot.service';
import { LodgeBookingService } from './lodge-booking.service';
import { LodgeMessagingService } from './lodge-messaging.service';

const percent = (part: number, whole: number) =>
  whole ? Math.round((part / whole) * 1000) / 10 : 0;

// the transit verification desk: headline numbers, document checks, broadcasts, manifest export
@Injectable()
export class LodgeDeskService {
  constructor(
    @InjectRepository(LodgeBooking)
    private readonly bookings: Repository<LodgeBooking>,
    private readonly dataSource: DataSource,
    private readonly access: LodgeAccessService,
    private readonly bedSlots: LodgeBedSlotService,
    private readonly bookingService: LodgeBookingService,
    private readonly messaging: LodgeMessagingService,
  ) {}

  async summary(scope: LodgeScope, lodgeId: string): Promise<DeskSummaryView> {
    await this.access.find(lodgeId, scope);
    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const [rows, recent, beds, awaitingDocs, withoutBed] = await Promise.all([
      this.bookings
        .createQueryBuilder('booking')
        .select('booking.status', 'status')
        .addSelect('booking.gender', 'gender')
        .addSelect('COUNT(*)', 'count')
        .where('booking.lodge_id = :lodgeId', { lodgeId })
        .groupBy('booking.status')
        .addGroupBy('booking.gender')
        .getRawMany<{ status: BookingStatus; gender: CorperGender; count: string }>(),
      this.bookings
        .createQueryBuilder('booking')
        .where('booking.lodge_id = :lodgeId', { lodgeId })
        .andWhere('booking.created_at >= :dayAgo', { dayAgo })
        .getCount(),
      this.bedSlots.summaries([lodgeId]),
      this.bookings.count({
        where: {
          lodgeId,
          status: In([...ACTIVE_BOOKING_STATUSES]),
          documentsVerifiedAt: IsNull(),
        },
      }),
      this.bookings.count({
        where: { lodgeId, status: In([...ACTIVE_BOOKING_STATUSES]), bedSlotId: IsNull() },
      }),
    ]);

    const byStatus = Object.values(BookingStatus).reduce(
      (acc, status) => ({ ...acc, [status]: 0 }),
      {} as Record<BookingStatus, number>,
    );
    let male = 0;
    let female = 0;
    let total = 0;
    for (const row of rows) {
      const count = Number(row.count);
      byStatus[row.status] += count;
      total += count;
      // the gender split counts corpers who still hold or held a place
      if (ACTIVE_BOOKING_STATUSES.includes(row.status)) {
        if (row.gender === CorperGender.MALE) male += count;
        else female += count;
      }
    }

    const admitted = byStatus.confirmed + byStatus.checked_in;
    const bedSummary = beds.get(lodgeId);
    const filled = (bedSummary?.inTransit ?? 0) + (bedSummary?.occupied ?? 0);
    return {
      totalRegistrations: total,
      newInLast24h: recent,
      confirmedAndAdmitted: admitted,
      checkedIn: byStatus.checked_in,
      gatePending: byStatus.pending,
      cancelledOrRejected: byStatus.cancelled + byStatus.rejected,
      admissionRatePercent: percent(admitted, total),
      capacity: {
        total: bedSummary?.total ?? 0,
        filled,
        fillRatePercent: percent(filled, bedSummary?.total ?? 0),
      },
      demographics: {
        male,
        female,
        malePercent: percent(male, male + female),
        femalePercent: percent(female, male + female),
      },
      byStatus,
      documentsAwaitingVerification: awaitingDocs,
      withoutBed,
    };
  }

  // the posting letter and IDs checked out; needs at least one uploaded file
  async verifyDocuments(
    scope: LodgeScope,
    bookingId: string,
    reviewerId: string,
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
      const files = await manager.count(LodgeBookingDocument, {
        where: { bookingId },
      });
      if (files === 0) {
        throw new ConflictException('No documents have been uploaded for this corper');
      }
      booking.documentsVerifiedAt = new Date();
      booking.documentsVerifiedBy = reviewerId;
      await manager.save(booking);
    });
    return this.bookingService.get(scope, bookingId);
  }

  // SMS / push / email to the filtered corpers; walk-ins without an account are counted, not messaged
  async broadcast(
    scope: LodgeScope,
    dto: BroadcastDto,
  ): Promise<{ recipients: number; notified: number; withoutAccount: number }> {
    const lodge = await this.access.find(dto.lodgeId, scope);
    const bookings = await this.bookings.find({
      where: {
        lodgeId: lodge.id,
        status: dto.status ?? In([...ACTIVE_BOOKING_STATUSES]),
        ...(dto.pickupBatchId ? { pickupBatchId: dto.pickupBatchId } : {}),
      },
      select: { id: true, corperId: true },
    });
    const userIds = bookings.flatMap((b) => (b.corperId ? [b.corperId] : []));
    const notified = await this.messaging.toCorpers(userIds, {
      title: lodge.name,
      body: dto.message,
      data: { lodgeId: lodge.id },
      channels: dto.channels,
    });
    return {
      recipients: userIds.length,
      notified,
      withoutAccount: bookings.length - userIds.length,
    };
  }

  async exportCsv(scope: LodgeScope, query: BookingManageQueryDto): Promise<string> {
    const rows = await this.bookingService.listAll(scope, query);
    return toCsv([
      [
        'Name',
        'Call-up number',
        'Phone',
        'Gender',
        'Status',
        'Room',
        'Bed',
        'Passcode',
        'Pickup trip',
        'Gate',
        'Transit',
        'Documents',
        'Luggage',
      ],
      ...rows.map((row) => [
        row.fullName,
        row.callUpNumber,
        row.whatsappPhone,
        row.gender,
        row.status,
        row.bedSlot?.room?.name,
        row.bedSlot?.code,
        row.passcode,
        row.pickup.batch?.label,
        row.pickup.gate?.name,
        row.transit.status,
        row.documentsStatus,
        row.luggageNote,
      ]),
    ]);
  }
}
