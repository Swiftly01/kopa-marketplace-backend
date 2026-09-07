import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { InteractionService } from './services/interaction.service';
import { ReviewRequestSchedulerService } from './services/review-request-scheduler.service';
import { ReviewRequestReconciliationService } from './services/review-request-reconciliation.service';
import { InteractionController } from './controllers/interaction.controller';
import notificationConfig from '../../config/notification.config';
import { BuyerSellerInteraction } from './entities/buyer-seller-interaction.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Product } from '../products/entities/product.entity';
import { User } from '../users/entities/user.entity';
import { Review } from '../reviews/entities/review.entity';
import { BullModule } from '@nestjs/bullmq';
import { INTERACTION_QUEUE_NAMES } from './constants';
import { ReviewRequestProcessor } from './processors/review-request.processor';
import { ReviewRequestSenderService } from './services/review-request-sender.service';
import { ReviewRequestDueSweeperService } from './services/review-request-due-sweeper.service';

@Module({
  imports: [
    ConfigModule.forFeature(notificationConfig),
    TypeOrmModule.forFeature([BuyerSellerInteraction, Product, User, Review]),

    BullModule.registerQueue({ name: INTERACTION_QUEUE_NAMES.REVIEW_REQUEST }),
  ],
  providers: [
    InteractionService,
    ReviewRequestSchedulerService,
    ReviewRequestReconciliationService,
    ReviewRequestProcessor,
    ReviewRequestSenderService,
    ReviewRequestDueSweeperService,
  ],
  controllers: [InteractionController],
  exports: [InteractionService],
})
export class InteractionModule {}
