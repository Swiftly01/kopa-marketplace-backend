import { Module } from '@nestjs/common';
import { SavedProductService } from './saved-product.service';
import { SavedProductController } from './saved-product.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SavedProduct } from './entities/saved-product.entity';
import { Product } from '../products/entities/product.entity';
import { ProductModule } from '../products/product.module';

@Module({
  imports: [TypeOrmModule.forFeature([SavedProduct, Product]), ProductModule],
  providers: [SavedProductService],
  controllers: [SavedProductController],
})
export class SavedProductModule {}
