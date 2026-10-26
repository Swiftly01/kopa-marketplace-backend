import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Category } from '../category/entities/category.entity';
import { User } from '../users/entities/user.entity';
import { NotificationModule } from '../../notification/notification.module';
import { LocationModule } from '../location/location.module';
import {
  LISTING_CATEGORY_HANDLERS,
  ListingCategoryHandler,
} from './categories/listing-category-handler.interface';
import { LISTING_CATEGORIES } from './categories/listing-categories';
import { ListingCategoryRegistry } from './categories/listing-category.registry';
import { AdminListingController } from './controllers/admin-listing.controller';
import { ListingController } from './controllers/listing.controller';
import { ListingImage } from './entities/listing-image.entity';
import { Listing } from './entities/listing.entity';
import { ListingCategoryService } from './services/listing-category.service';
import { ListingImageService } from './services/listing-image.service';
import { ListingModerationService } from './services/listing-moderation.service';
import { ListingService } from './services/listing.service';

// handlers and their tables come from the single LISTING_CATEGORIES list
const handlerClasses = LISTING_CATEGORIES.map(({ handler }) => handler);
const categoryEntities = LISTING_CATEGORIES.flatMap(({ entities }) => entities);

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Listing,
      ListingImage,
      Category,
      User,
      ...categoryEntities,
    ]),
    LocationModule,
    NotificationModule,
  ],
  controllers: [ListingController, AdminListingController],
  providers: [
    ...handlerClasses,
    {
      provide: LISTING_CATEGORY_HANDLERS,
      useFactory: (...handlers: ListingCategoryHandler[]) => handlers,
      inject: handlerClasses,
    },
    ListingCategoryRegistry,
    ListingCategoryService,
    ListingImageService,
    ListingModerationService,
    ListingService,
  ],
})
export class ListingModule {}
