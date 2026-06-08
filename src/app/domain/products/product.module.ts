import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LocationModule } from '../location/location.module';
import { User } from '../users/entities/user.entity';
import { ProductController } from './controllers/product.controller';
import { ProductImage } from './entities/product-image.entity';
import { Product } from './entities/product.entity';
import { ProductService } from './services/product.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Product, ProductImage, User]),
    LocationModule,
  ],
  providers: [ProductService],
  controllers: [ProductController],
})
export class ProductModule {}
