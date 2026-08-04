import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { AppLogger } from '../../../logger/logger.service';
import { ReviewStatus } from '../enums/review-status.enum';
import { Review } from '../entities/review.entity';
import { Product } from '../../products/entities/product.entity';
import { User } from '../../users/entities/user.entity';

@Injectable()
export class RatingAggregationService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly logger: AppLogger,
  ) {}

  async recalculateForProduct(productId: string): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const { avg, count } = await this.aggregate(
        manager.getRepository(Review),
        'productId',
        productId,
      );

      await manager
        .getRepository(Product)
        .update(productId, { rating: avg, reviewCount: count });
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

  async recalculateBoth(sellerId: string, productId: string): Promise<void> {
    await this.recalculateForProduct(productId);
    await this.recalculateForSeller(sellerId);
  }

  private async aggregate(
    reviewRepository: Repository<Review>,
    column: 'productId' | 'sellerId',
    value: string,
  ): Promise<{ avg: number; count: number }> {
    const dbColumn = column === 'productId' ? 'product_id' : 'seller_id';

    const raw = await reviewRepository
      .createQueryBuilder('review')
      .select('AVG(review.rating)', 'avg')
      .addSelect('COUNT(review.id)', 'count')
      .where(`review.${dbColumn} = :value`, { value })
      .andWhere('review.status = :status', { status: ReviewStatus.PUBLISHED })
      .andWhere('review.deleted_at IS NULL')
      .getRawOne<{ avg: string | null; count: string }>();

    return {
      avg: raw?.avg ? Number(parseFloat(raw.avg).toFixed(2)) : 0,
      count: raw?.count ? parseInt(raw.count, 10) : 0,
    };
  }
}
