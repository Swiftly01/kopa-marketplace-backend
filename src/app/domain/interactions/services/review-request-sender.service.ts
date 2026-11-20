import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { BuyerSellerInteraction } from '../entities/buyer-seller-interaction.entity';
import { Repository } from 'typeorm';
import { Product } from '../../products/entities/product.entity';
import { Listing } from '../../listings/entities/listing.entity';
import { User } from '../../users/entities/user.entity';
import { Review } from '../../reviews/entities/review.entity';
import { NotificationService } from '../../../notification/services/notification.service';
import { ConfigService } from '@nestjs/config';
import { AppLogger } from '../../../logger/logger.service';
import { ReviewRequestJobData } from '../interfaces/review-request-job.interface';
import { buildReviewDeepLink } from '../utils/deep-link.util';
import { NotificationType } from '../../../notification/enums/notification-type.enum';
import { NotificationChannel } from '../../../notification/enums/notification-channel.enum';
import { NotificationPriority } from '../../../notification/enums/notification-priority.enum';

export type ReviewRequestSendOutcome = 'sent' | 'skipped';

// what the buyer is being asked to review, whether a product or an ad
interface ReviewTarget {
  name: string;
  imageUrl: string | null;
}

@Injectable()
export class ReviewRequestSenderService {
  constructor(
    @InjectRepository(BuyerSellerInteraction)
    private readonly interactionRepository: Repository<BuyerSellerInteraction>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(Listing)
    private readonly listingRepository: Repository<Listing>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Review)
    private readonly reviewRepository: Repository<Review>,
    private readonly notificationService: NotificationService,
    private readonly configService: ConfigService,
    private readonly logger: AppLogger,
  ) {}

  async send(
    data: ReviewRequestJobData,
    context: string,
  ): Promise<ReviewRequestSendOutcome> {
    // `productId` is the id of a product OR of an ad (ids are UUIDs)
    const { interactionId, buyerId, sellerId, productId } = data;

    const interaction = await this.interactionRepository.findOne({
      where: {
        id: interactionId,
      },
    });

    if (!interaction || interaction.reviewRequestSentAt) {
      this.logger.log(
        `[${context}] Skipping review request for interaction=${interactionId}: already sent or missing`,
        'ReviewRequestSenderService',
      );

      return 'skipped';
    }

    const alreadyReviewed = await this.reviewRepository.exists({
      where: [
        { buyerId, productId },
        { buyerId, listingId: productId },
      ],
    });
    if (alreadyReviewed) {
      this.logger.log(
        `[${context}] Skipping review request for buyer=${buyerId} product=${productId}: already reviewed`,
        ' ReviewRequestSenderService',
      );

      await this.interactionRepository.update(interactionId, {
        reviewRequestSentAt: new Date(),
      });

      return 'skipped';
    }

    const target = interaction.listingId
      ? await this.loadListing(productId, sellerId)
      : await this.loadProduct(productId, sellerId);

    if (!target) {
      this.logger.log(
        `[${context}] Skipping review request for buyer=${buyerId} target=${productId}: product/ad missing or seller mismatch`,
        'ReviewRequestSenderService',
      );
      await this.interactionRepository.update(interactionId, {
        reviewRequestSentAt: new Date(),
      });
      return 'skipped';
    }

    const seller = await this.userRepository.findOne({
      where: {
        id: sellerId,
      },
    });

    if (!seller) {
      await this.interactionRepository.update(interactionId, {
        reviewRequestSentAt: new Date(),
      });

      return 'skipped';
    }

    const sellerName =
      `${seller.firstName} ${seller.lastName}`.trim() || `the seller`;

    const deepLink = buildReviewDeepLink(this.configService, {
      productId,
      sellerId,
      interactionId,
    });

    await this.notificationService.send({
      userId: buyerId,
      type: NotificationType.REVIEW_REQUEST,
      title: `How was your experience with ${sellerName}?`,
      body: `Tell other buyers what you thought of ${target.name}`,
      channels: [NotificationChannel.PUSH, NotificationChannel.EMAIL],
      priority: NotificationPriority.NORMAL,
      data: {
        sellerName,
        productName: target.name,
        productImageUrl: target.imageUrl,
        deepLink,
        productId,
        sellerId,
        interactionId,
      },
      idempotencyKey: `review-request_${buyerId}_${productId}_${interactionId}`,
    });

    await this.interactionRepository.update(interactionId, {
      reviewRequestSentAt: new Date(),
    });

    this.logger.log(
      `[${context}] Review request sent: buyer=${buyerId} seller=${sellerId} product=${productId}`,
      'ReviewRequestSenderService',
    );

    return 'sent';
  }

  private async loadProduct(
    productId: string,
    sellerId: string,
  ): Promise<ReviewTarget | null> {
    const product = await this.productRepository.findOne({
      where: { id: productId },
      relations: ['images'],
    });

    if (!product || product.sellerId !== sellerId) return null;

    return {
      name: product.name,
      imageUrl: product.getMainImage()?.cloudinaryUrl ?? null,
    };
  }

  private async loadListing(
    listingId: string,
    sellerId: string,
  ): Promise<ReviewTarget | null> {
    // soft-deleted ads are excluded by TypeORM, so a deleted ad is skipped
    const listing = await this.listingRepository.findOne({
      where: { id: listingId },
      relations: ['images'],
    });

    if (!listing || listing.userId !== sellerId) return null;

    // position 0 is the ad's title picture
    const [titlePicture] = [...(listing.images ?? [])].sort(
      (a, b) => a.position - b.position,
    );

    return {
      name: listing.title,
      imageUrl: titlePicture?.url ?? null,
    };
  }
}
