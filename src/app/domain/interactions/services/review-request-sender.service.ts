import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { BuyerSellerInteraction } from '../entities/buyer-seller-interaction.entity';
import { Repository } from 'typeorm';
import { Product } from '../../products/entities/product.entity';
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
@Injectable()
export class ReviewRequestSenderService {
  constructor(
    @InjectRepository(BuyerSellerInteraction)
    private readonly interactionRepository: Repository<BuyerSellerInteraction>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
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
      where: {
        buyerId,
        productId,
      },
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

    const product = await this.productRepository.findOne({
      where: {
        id: productId,
      },
      relations: ['images'],
    });
    this.logger.log(product);

    if (!product || product.sellerId !== sellerId) {
      this.logger.log(
        `[${context}] Skipping review request for buyer=${buyerId} product=${productId}: product missing or seller mismatch`,
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

    const mainImage = product.getMainImage();
    const deepLink = buildReviewDeepLink(this.configService, {
      productId,
      sellerId,
      interactionId,
    });

    await this.notificationService.send({
      userId: buyerId,
      type: NotificationType.REVIEW_REQUEST,
      title: `How was your experience with ${sellerName}?`,
      body: `Tell other buyers what you thought of ${product.name}`,
      channels: [NotificationChannel.PUSH, NotificationChannel.EMAIL],
      priority: NotificationPriority.NORMAL,
      data: {
        sellerName,
        productName: product.name,
        productImageUrl: mainImage?.cloudinaryUrl ?? null,
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
}
