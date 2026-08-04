import { Module } from '@nestjs/common';

import { ReviewService } from './services/review.service';
import { ReviewEligibilityService } from './services/review-eligibility.service';
import { RatingAggregationService } from './services/rating-aggregation.service';
import { InteractionModule } from '../interactions/interaction.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Review } from './entities/review.entity';
import { Product } from '../products/entities/product.entity';
import { User } from '../users/entities/user.entity';
import { ReviewController } from './controllers/review.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Review, Product, User]),
    InteractionModule,
  ],
  providers: [
    ReviewService,
    ReviewEligibilityService,
    RatingAggregationService,
  ],
  controllers: [ReviewController],
  exports: [ReviewService],
})
export class ReviewModule {}
