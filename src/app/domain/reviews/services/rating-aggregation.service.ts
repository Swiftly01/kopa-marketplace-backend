import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { AppLogger } from '../../../logger/logger.service';
import { ReviewStatus } from '../enums/review-status.enum';
import { Review } from '../entities/review.entity';
import { Listing } from '../../listings/entities/listing.entity';
import { Product } from '../../products/entities/product.entity';
import { User } from '../../users/entities/user.entity';

@Injectable()
export class RatingAggregationService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly logger: AppLogger,
  ) {}

  // targetId is a product id or an ad id; the id only exists in one of the two tables
  async recalculateForTarget(targetId: string): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const { avg, count } = await this.aggregate(
        manager.getRepository(Review),
        'target',
        targetId,
      );

      const patch = { rating: avg, reviewCount: count };
      await manager.getRepository(Product).update(targetId, patch);
      await manager.getRepository(Listing).update(targetId, patch);
    });
  }

  async recalculateForSeller(sellerId: string): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const { avg, count } = await this.aggregate(
        manager.getRepository(Review),
        'sellerId',
        sellerId,
      );

      await manager.getRepository(User).update(sellerId, {
        sellerAverageRating: avg,
        sellerReviewCount: count,
      });
    });
  }

  async recalculateBoth(sellerId: string, targetId: string): Promise<void> {
    await this.recalculateForTarget(targetId);
    await this.recalculateForSeller(sellerId);
  }

  private async aggregate(
    reviewRepository: Repository<Review>,
    column: 'target' | 'sellerId',
    value: string,
  ): Promise<{ avg: number; count: number }> {
    const filter =
      column === 'target'
        ? '(review.product_id = :value OR review.listing_id = :value)'
        : 'review.seller_id = :value';

    const raw = await reviewRepository
      .createQueryBuilder('review')
      .select('AVG(review.rating)', 'avg')
      .addSelect('COUNT(review.id)', 'count')
      .where(filter, { value })
      .andWhere('review.status = :status', { status: ReviewStatus.PUBLISHED })
      .andWhere('review.deleted_at IS NULL')
      .getRawOne<{ avg: string | null; count: string }>();

    return {
      avg: raw?.avg ? Number(parseFloat(raw.avg).toFixed(2)) : 0,
      count: raw?.count ? parseInt(raw.count, 10) : 0,
    };
  }
}
