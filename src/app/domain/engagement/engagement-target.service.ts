import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Listing } from '../listings/entities/listing.entity';
import { ListingStatus } from '../listings/enums/listing-status.enum';
import { Product } from '../products/entities/product.entity';
import { ProductStatus } from '../products/enums/product-status.enum';

// what a buyer can review, save or contact the seller about
export interface EngagementTarget {
  kind: 'product' | 'listing';
  id: string;
  sellerId: string;
  // true while buyers may still interact with it (live and not deleted)
  isLive: boolean;
}

// Products and ads both have UUID ids, so an id alone says which one it is.
// Reviews, saved items and contact tracking use this to treat both the same way.
@Injectable()
export class EngagementTargetService {
  constructor(
    @InjectRepository(Product)
    private readonly products: Repository<Product>,
    @InjectRepository(Listing)
    private readonly listings: Repository<Listing>,
  ) {}

  async resolve(id: string): Promise<EngagementTarget | null> {
    const product = await this.products.findOne({
      where: { id },
      select: { id: true, sellerId: true, status: true, isActive: true },
    });
    if (product) {
      return {
        kind: 'product',
        id,
        sellerId: product.sellerId,
        isLive: product.isActive && product.status === ProductStatus.ACTIVE,
      };
    }

    const listing = await this.listings.findOne({
      where: { id },
      select: { id: true, userId: true, status: true },
    });
    if (listing) {
      return {
        kind: 'listing',
        id,
        sellerId: listing.userId,
        isLive: listing.status === ListingStatus.ACTIVE,
      };
    }
    return null;
  }
}
