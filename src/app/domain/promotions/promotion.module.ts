import { Module } from '@nestjs/common';
import { PromotionsService } from './promotions.service';
import { PromotionsController } from './promotions.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Promotion } from './entities/promotion.entity';
import { PromotionClaim } from './entities/promotion-claim.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Promotion, PromotionClaim])],
  providers: [PromotionsService],
  controllers: [PromotionsController],
})
export class PromotionModule {}
