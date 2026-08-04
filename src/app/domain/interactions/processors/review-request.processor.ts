import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { INTERACTION_QUEUE_NAMES } from '../constants';
import { InjectRepository } from '@nestjs/typeorm';
import { BuyerSellerInteraction } from '../entities/buyer-seller-interaction.entity';
import { Repository } from 'typeorm';
import { Product } from '../../products/entities/product.entity';
import { User } from '../../users/entities/user.entity';
import { NotificationService } from '../../../notification/services/notification.service';
import { ConfigService } from '@nestjs/config';
import { AppLogger } from '../../../logger/logger.service';
import { Job } from 'bullmq';
import { ReviewRequestJobData } from '../interfaces/review-request-job.interface';
import { NotificationType } from '../../../notification/enums/notification-type.enum';
import { NotificationChannel } from '../../../notification/enums/notification-channel.enum';
import { NotificationPriority } from '../../../notification/enums/notification-priority.enum';
import { buildReviewDeepLink } from '../utils/deep-link.util';
import { Review } from '../../reviews/entities/review.entity';

@Injectable()
@Processor(INTERACTION_QUEUE_NAMES.REVIEW_REQUEST, { concurrency: 10 })
export class ReviewRequestProcessor extends WorkerHost {
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
  ) {
    super();
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job, err: Error) {
    this.logger.error(
      `Review request job=${job?.id} failed: ${err.message}`,
      err.stack,
      'ReviewRequestProcessor',
    );
  }

  async process(job: Job<ReviewRequestJobData>): Promise<void> {
    const { interactionId, buyerId, sellerId, productId } = job.data;

    const alreadyReviewed = await this.reviewRepository.exists({
      where: { buyerId, productId },
    });

    if (alreadyReviewed) {
      this.logger.log(
        `Skipping review request for buyer=${buyerId} product=${productId}: already reviewed`,
        'ReviewRequestProcessor',
      );
      return;
    }

    const product = await this.productRepository.findOne({
      where: { id: productId },
      relations: ['images'],
    });

    if (!product || product.sellerId !== sellerId) {
      this.logger.log(
        `Skipping review request for buyer=${buyerId} product=${productId}: product missing or seller mismatch`,
        'ReviewRequestProcessor',
      );
      return;
    }

    const seller = await this.userRepository.findOne({
      where: { id: sellerId },
    });

    if (!seller) return;

    const sellerName =
      `${seller.firstName} ${seller.lastName}`.trim() || 'the seller';

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
      body: `Tell other buyers what you thought of ${product.name}.`,
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
      `Review request sent: buyer=${buyerId} seller=${sellerId} product=${productId}`,
      'ReviewRequestProcessor',
    );
  }
}
