import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Listing } from '../listings/entities/listing.entity';
import { Product } from '../products/entities/product.entity';
import { EngagementTargetService } from './engagement-target.service';

@Module({
  imports: [TypeOrmModule.forFeature([Product, Listing])],
  providers: [EngagementTargetService],
  exports: [EngagementTargetService],
})
export class EngagementTargetModule {}
