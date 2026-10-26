import { Type } from '@nestjs/common';
import { ListingCategoryHandler } from './listing-category-handler.interface';
import { ProductSaleDetails } from './product-sale/product-sale-details.entity';
import { ProductSaleHandler } from './product-sale/product-sale.handler';
import { PropertyRentDetails } from './property-rent/property-rent-details.entity';
import { PropertyRentHandler } from './property-rent/property-rent.handler';

export interface ListingCategoryRegistration {
  handler: Type<ListingCategoryHandler>;
  // tables the handler owns; registered with TypeORM by the listing module
  entities: Array<new () => object>;
}

// THE one place to register a new category (then add its entities to DatabaseModule + a migration)
export const LISTING_CATEGORIES: ListingCategoryRegistration[] = [
  { handler: PropertyRentHandler, entities: [PropertyRentDetails] },
  // fallback for every other leaf category (must stay a single registration)
  { handler: ProductSaleHandler, entities: [ProductSaleDetails] },
];
