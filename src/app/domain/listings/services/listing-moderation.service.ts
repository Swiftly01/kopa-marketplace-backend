import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Paginated } from '../../../common/pagination/interfaces/paginated.interface';
import { PaginationProvider } from '../../../common/pagination/providers/pagination.provider';
import { AppLogger } from '../../../logger/logger.service';
import { NotificationType } from '../../../notification/enums/notification-type.enum';
import { NotificationService } from '../../../notification/services/notification.service';
import {
  AdminListingDetailView,
  AdminListingCardView,
} from '../dtos/listing-response.dto';
import { AdminListingQueryDto } from '../dtos/admin-listing-query.dto';
import { Listing } from '../entities/listing.entity';
import { ListingStatus } from '../enums/listing-status.enum';
import { toCardView } from '../mappers/listing.mapper';
import { ListingService } from './listing.service';

// statuses an admin can see; drafts are private to their owner
const REVIEWABLE_STATUSES = [
  ListingStatus.PENDING_REVIEW,
  ListingStatus.ACTIVE,
  ListingStatus.REJECTED,
  ListingStatus.INACTIVE,
];

// the admin side of the lifecycle: review queue, approve, reject
@Injectable()
export class ListingModerationService {
  constructor(
    @InjectRepository(Listing)
    private readonly listings: Repository<Listing>,
    private readonly dataSource: DataSource,
    private readonly listingService: ListingService,
    private readonly notifications: NotificationService,
    private readonly pagination: PaginationProvider,
    private readonly logger: AppLogger,
  ) {}

  async list(
    query: AdminListingQueryDto,
    baseUrl: string,
  ): Promise<Paginated<AdminListingCardView>> {
    const qb = this.listings
      .createQueryBuilder('listing')
      .leftJoinAndSelect('listing.images', 'image', 'image.position = 0')
      .leftJoin('listing.user', 'user')
      .addSelect([
        'user.id',
        'user.firstName',
        'user.lastName',
        'user.email',
        'user.phoneNumber',
      ]);

    if (query.status) {
      qb.where('listing.status = :status', { status: query.status });
    } else {
      qb.where('listing.status IN (:...statuses)', {
        statuses: REVIEWABLE_STATUSES,
      });
    }
    if (query.categoryId) {
      qb.andWhere('listing.categoryId = :categoryId', {
        categoryId: query.categoryId,
      });
    }
    if (query.search) {
      qb.andWhere('listing.title ILIKE :search', {
        search: `%${query.search}%`,
      });
    }
    // the queue is first-come first-served; other tabs show the newest first
    if (query.status === ListingStatus.PENDING_REVIEW) {
      qb.orderBy('listing.updatedAt', 'ASC');
    } else {
      qb.orderBy('listing.updatedAt', 'DESC');
    }

    const page = await this.pagination.paginateQuery(qb, query, baseUrl);
    return {
      ...page,
      data: page.data.map((listing) => ({
        ...toCardView(listing),
        seller: listing.user
          ? {
              id: listing.user.id,
              name: `${listing.user.firstName} ${listing.user.lastName}`.trim(),
              email: listing.user.email,
              phoneNumber: listing.user.phoneNumber,
            }
          : null,
      })),
    };
  }

  // number of ads per status, for the tab badges
  async stats(): Promise<Record<string, number>> {
    const rows = await this.listings
      .createQueryBuilder('listing')
      .select('listing.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .where('listing.status IN (:...statuses)', {
        statuses: REVIEWABLE_STATUSES,
      })
      .groupBy('listing.status')
      .getRawMany<{ status: string; count: string }>();

    const counts: Record<string, number> = Object.fromEntries(
      REVIEWABLE_STATUSES.map((status) => [status, 0]),
    );
    rows.forEach((row) => (counts[row.status] = Number(row.count)));
    return counts;
  }

  // pending (or previously rejected) -> live
  async approve(
    adminId: string,
    listingId: string,
  ): Promise<AdminListingDetailView> {
    const listing = await this.decide(
      listingId,
      [ListingStatus.PENDING_REVIEW, ListingStatus.REJECTED],
      (target) => {
        target.status = ListingStatus.ACTIVE;
        target.rejectionReason = null;
        target.publishedAt ??= new Date();
        target.reviewedAt = new Date();
        target.reviewedBy = adminId;
      },
    );

    await this.notifyOwner(listing, {
      title: 'Your ad is live',
      body: `"${listing.title}" was approved and is now visible to everyone.`,
    });
    return this.listingService.getForAdmin(listingId);
  }

  // pending or live -> rejected, with a reason the owner will read
  async reject(
    adminId: string,
    listingId: string,
    reason: string,
  ): Promise<AdminListingDetailView> {
    const listing = await this.decide(
      listingId,
      [ListingStatus.PENDING_REVIEW, ListingStatus.ACTIVE],
      (target) => {
        target.status = ListingStatus.REJECTED;
        target.rejectionReason = reason;
        target.reviewedAt = new Date();
        target.reviewedBy = adminId;
      },
    );

    await this.notifyOwner(listing, {
      title: 'Your ad was not approved',
      body: `"${listing.title}" was rejected: ${reason}`,
    });
    return this.listingService.getForAdmin(listingId);
  }

  // locks the row, checks the current status allows the decision, then applies it
  private async decide(
    listingId: string,
    allowedFrom: ListingStatus[],
    apply: (listing: Listing) => void,
  ): Promise<Listing> {
    return this.dataSource.transaction(async (manager) => {
      const listing = await manager.findOne(Listing, {
        where: { id: listingId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!listing) {
        throw new NotFoundException('Listing not found');
      }
      if (!allowedFrom.includes(listing.status)) {
        throw new BadRequestException(
          `A ${listing.status.replace('_', ' ')} listing cannot be changed this way`,
        );
      }
      apply(listing);
      return manager.save(listing);
    });
  }

  // a failed notification must never undo or fail the decision
  private async notifyOwner(
    listing: Listing,
    message: { title: string; body: string },
  ): Promise<void> {
    try {
      await this.notifications.send({
        userId: listing.userId,
        type: NotificationType.GENERIC,
        ...message,
        data: { listingId: listing.id, status: listing.status },
      });
    } catch (error) {
      this.logger.warn(
        `Could not notify owner of listing ${listing.id}: ${String(error)}`,
        ListingModerationService.name,
      );
    }
  }
}
