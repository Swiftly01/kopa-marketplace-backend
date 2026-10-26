import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Review } from '../entities/review.entity';
import { Repository } from 'typeorm';
import { ReviewEligibilityService } from './review-eligibility.service';
import { RatingAggregationService } from './rating-aggregation.service';
import { PaginationProvider } from '../../../common/pagination/providers/pagination.provider';
import { ConfigService } from '@nestjs/config';
import { CreateReviewDto } from '../dtos/create-review.dto';
import { ReviewStatus } from '../enums/review-status.enum';
import { ReviewQueryDto } from '../dtos/review-query.dto';
import { UpdateReviewDto } from '../dtos/update-review.dto';
import { EngagementTargetService } from '../../engagement/engagement-target.service';

@Injectable()
export class ReviewService {
  constructor(
    @InjectRepository(Review)
    private readonly reviewRepository: Repository<Review>,
    private readonly eligibilityService: ReviewEligibilityService,
    private readonly ratingAggregation: RatingAggregationService,
    private readonly paginationProvider: PaginationProvider,
    private readonly configService: ConfigService,
    private readonly targets: EngagementTargetService,
  ) {}

  async createReview(buyerId: string, dto: CreateReviewDto): Promise<Review> {
    await this.eligibilityService.assertCanReview(
      buyerId,
      dto.sellerId,
      dto.productId,
    );

    // dto.productId is a product id or an ad id
    const target = await this.targets.resolve(dto.productId);
    if (!target) {
      throw new NotFoundException('Product not found');
    }
    if (target.sellerId !== dto.sellerId) {
      throw new ForbiddenException(
        'The product does not belong to the specified seller',
      );
    }

    const existing = await this.findOwnReview(buyerId, target.id);
    if (existing) {
      throw new ConflictException('You have already reviewed this product');
    }

    const review = this.reviewRepository.create({
      buyerId,
      sellerId: dto.sellerId,
      productId: target.kind === 'product' ? target.id : null,
      listingId: target.kind === 'listing' ? target.id : null,
      interactionId: dto.interactionId ?? null,
      rating: dto.rating,
      comment: dto.comment ?? null,
    });

    const saved = await this.reviewRepository.save(review);

    await this.ratingAggregation.recalculateBoth(dto.sellerId, target.id);
    return saved;
  }

  async updateReview(
    buyerId: string,
    reviewId: string,
    dto: UpdateReviewDto,
  ): Promise<Review> {
    const review = await this.findOwnedByBuyer(buyerId, reviewId);

    const editWindowHours = this.configService.get<number>(
      'interactionConfig.reviewEditWindowHours',
      72,
    );
    const editableUntil =
      review.createdAt.getTime() + editWindowHours * 60 * 60 * 1000;

    if (Date.now() > editableUntil) {
      throw new ForbiddenException(
        `Reviews can only be edited within ${editWindowHours} hours of posting`,
      );
    }

    if (dto.rating !== undefined) review.rating = dto.rating;
    if (dto.comment !== undefined) review.comment = dto.comment;

    const saved = await this.reviewRepository.save(review);
    await this.ratingAggregation.recalculateBoth(
      review.sellerId,
      review.productId ?? (review.listingId as string),
    );

    return saved;
  }

  async deleteReview(buyerId: string, reviewId: string): Promise<void> {
    const review = await this.findOwnedByBuyer(buyerId, reviewId);
    await this.reviewRepository.softDelete(review.id);
    await this.ratingAggregation.recalculateBoth(
      review.sellerId,
      review.productId ?? (review.listingId as string),
    );
  }

  async listForProduct(
    productId: string,
    query: ReviewQueryDto,
    baseUrl?: string,
  ) {
    const qb = this.reviewRepository
      .createQueryBuilder('review')
      .leftJoin('review.buyer', 'buyer')
      .addSelect(['buyer.id', 'buyer.firstName', 'buyer.lastName'])
      .where(
        '(review.productId = :productId OR review.listingId = :productId)',
        { productId },
      )
      .andWhere('review.status = :status', {
        status: query.status ?? ReviewStatus.PUBLISHED,
      })
      .orderBy('review.createdAt', 'DESC');

    return this.paginationProvider.paginateQuery(qb, query, baseUrl);
  }

  async listForSeller(
    sellerId: string,
    query: ReviewQueryDto,
    baseUrl?: string,
  ) {
    const qb = this.reviewRepository
      .createQueryBuilder('review')
      .leftJoin('review.buyer', 'buyer')
      .addSelect(['buyer.id', 'buyer.firstName', 'buyer.lastName'])
      .leftJoin('review.product', 'product')
      .addSelect(['product.id', 'product.name', 'product.slug'])
      .leftJoin('review.listing', 'listing')
      .addSelect(['listing.id', 'listing.title', 'listing.slug'])
      .where('review.sellerId = :sellerId', { sellerId })
      .andWhere('review.status = :status', {
        status: query.status ?? ReviewStatus.PUBLISHED,
      })
      .orderBy('review.createdAt', 'DESC');

    const page = await this.paginationProvider.paginateQuery(
      qb,
      query,
      baseUrl,
    );
    // the seller reviews screen shows `product`; an ad's review reuses that slot
    return {
      ...page,
      data: page.data.map((review) => ({
        ...review,
        product:
          review.product ??
          (review.listing
            ? {
                id: review.listing.id,
                name: review.listing.title,
                slug: review.listing.slug,
              }
            : null),
      })),
    };
  }

  async checkEligibility(buyerId: string, sellerId: string, productId: string) {
    const eligibility = await this.eligibilityService.checkEligibility(
      buyerId,
      sellerId,
      productId,
    );

    const existingReview = await this.findOwnReview(buyerId, productId);

    return {
      ...eligibility,
      alreadyReviewed: !!existingReview,
      review: existingReview ?? null,
    };
  }

  // the buyer's review of a product or an ad (targetId is either)
  private findOwnReview(buyerId: string, targetId: string) {
    return this.reviewRepository.findOne({
      where: [
        { buyerId, productId: targetId },
        { buyerId, listingId: targetId },
      ],
    });
  }

  private async findOwnedByBuyer(
    buyerId: string,
    reviewId: string,
  ): Promise<Review> {
    const review = await this.reviewRepository.findOne({
      where: { id: reviewId, buyerId },
    });

    if (!review) {
      throw new NotFoundException('Review not found');
    }

    return review;
  }
}
