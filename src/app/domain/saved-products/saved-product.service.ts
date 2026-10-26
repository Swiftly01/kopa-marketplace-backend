import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { SavedProduct } from './entities/saved-product.entity';
import { IsNull, Repository } from 'typeorm';
import { EngagementTargetService } from '../engagement/engagement-target.service';
import { ListingStatus } from '../listings/enums/listing-status.enum';
import { toCardView } from '../listings/mappers/listing.mapper';
import { PaginationQueryDto } from '../../common/pagination/dtos/pagination-query.dto';
import { AppLogger } from '../../logger/logger.service';
import { SavedProductDto } from './dtos/saved-product.dto';
import { ProductStatus } from '../products/enums/product-status.enum';
import { GetSavedProductsQueryDto } from './dtos/get-saved-product.dto';
import { QueryFilterProvider } from '../../common/providers/query-filter-provider';
import { PaginationProvider } from '../../common/pagination/providers/pagination.provider';

@Injectable()
export class SavedProductService {
  constructor(
    @InjectRepository(SavedProduct)
    private readonly savedProductRepository: Repository<SavedProduct>,

    private readonly targets: EngagementTargetService,
    private readonly queryFilterProvider: QueryFilterProvider,
    private readonly paginateProvider: PaginationProvider,

    private readonly logger: AppLogger,
  ) {}

  // dto.productId is the id of a product OR of an ad
  async saveProduct(buyerId: string, dto: SavedProductDto) {
    const { productId: targetId, note } = dto;

    const target = await this.targets.resolve(targetId);
    if (!target || !target.isLive) {
      throw new NotFoundException(
        'Product not found or is no longer available',
      );
    }

    const existing = await this.findAny(buyerId, targetId);

    if (existing) {
      if (existing.deletedAt === null) {
        throw new ConflictException('You hav already saved this product');
      }

      // Re-save: restore the soft-deleted row
      existing.deletedAt = null;
      existing.note = note ?? null;
      const restored = await this.savedProductRepository.save(existing);
      this.logger.log(`Buyer ${buyerId} re-saved ${target.kind} ${targetId}`);

      return restored;
    }

    const saved = this.savedProductRepository.create({
      buyerId,
      productId: target.kind === 'product' ? target.id : null,
      listingId: target.kind === 'listing' ? target.id : null,
      note: note ?? null,
    });

    const result = await this.savedProductRepository.save(saved);
    this.logger.log(`Buyer ${buyerId} saved ${target.kind} ${targetId}`);

    return result;
  }

  async unsaveProduct(buyerId: string, targetId: string): Promise<void> {
    const saved = await this.findActive(buyerId, targetId);

    if (!saved) {
      throw new NotFoundException('Saved product not found');
    }

    saved.deletedAt = new Date();
    await this.savedProductRepository.save(saved);
    this.logger.log(`Buyer ${buyerId} unsaved ${targetId}`);
  }

  async toggleSave(
    buyerId: string,
    targetId: string,
  ): Promise<{ isSaved: boolean }> {
    if (await this.findActive(buyerId, targetId)) {
      await this.unsaveProduct(buyerId, targetId);
      return { isSaved: false };
    }

    // saveProduct checks that the product or ad is still live
    await this.saveProduct(buyerId, { productId: targetId });
    return { isSaved: true };
  }

  async getSavedProducts(
    buyerId: string,
    filters: GetSavedProductsQueryDto,
    baseUrl?: string,
  ) {
    let qb = this.savedProductRepository
      .createQueryBuilder('sp')
      .innerJoinAndSelect('sp.product', 'p')
      .leftJoinAndSelect('p.images', 'img')
      .leftJoinAndSelect('p.category', 'cat')
      .leftJoinAndSelect('p.seller', 'seller')
      .where('sp.buyerId = :buyerId', { buyerId })
      .andWhere('sp.deletedAt IS NULL')
      // Only surface products that are still active
      .andWhere('p.status = :status', { status: ProductStatus.ACTIVE })
      .andWhere('p.isActive = true');

    if (filters.categoryId) {
      const categoryId = filters.categoryId;
      qb.andWhere('p.categoryId = :categoryId', { categoryId });
    }

    qb = this.queryFilterProvider.applyFilters(qb, filters, {
      alias: 'product',
      searchableFields: ['name', 'description'],
      sortMap: {
        newest: { field: 'createdAt', order: 'DESC' },
        'price-asc': { field: 'price', order: 'ASC' },
        'price-desc': { field: 'price', order: 'DESC' },
        popular: { field: 'views', order: 'DESC' },
      },
      allowedSortFields: ['price', 'createdAt', 'views'],
    });

    return this.paginateProvider.paginateQuery(qb, filters, baseUrl);
  }

  // the buyer's saved ads (live ones only), newest saved first
  async getSavedAds(
    buyerId: string,
    filters: PaginationQueryDto,
    baseUrl?: string,
  ) {
    const qb = this.savedProductRepository
      .createQueryBuilder('sp')
      .innerJoinAndSelect('sp.listing', 'l')
      .leftJoinAndSelect('l.images', 'img', 'img.position = 0')
      .where('sp.buyerId = :buyerId', { buyerId })
      .andWhere('sp.deletedAt IS NULL')
      .andWhere('l.status = :status', { status: ListingStatus.ACTIVE })
      .orderBy('sp.createdAt', 'DESC');

    const page = await this.paginateProvider.paginateQuery(
      qb,
      filters,
      baseUrl,
    );
    return { ...page, data: page.data.map((row) => toCardView(row.listing!)) };
  }

  async getSaveStatus(buyerId: string, targetId: string) {
    const saved = await this.findActive(buyerId, targetId);

    return {
      isSaved: !!saved,
      savedId: saved?.id,
    };
  }

  /**
   * Batch-check save status for a list of productIds.
   * Useful for rendering the heart icon on a product grid.
   */
  async getBatchSaveStatus(
    buyerId: string,
    productIds: string[],
  ): Promise<Record<string, boolean>> {
    if (!productIds.length) return {};

    const saved = await this.savedProductRepository.find({
      where: productIds.map((productId) => ({
        buyerId,
        productId,
        deletedAt: IsNull(),
      })),
      select: ['productId'],
    });

    const savedSet = new Set(saved.map((s) => s.productId));
    return Object.fromEntries(productIds.map((id) => [id, savedSet.has(id)]));
  }

  async getSavedCount(buyerId: string): Promise<number> {
    return this.savedProductRepository.count({
      where: { buyerId, deletedAt: IsNull() },
    });
  }

  async getProductSaveCount(productId: string): Promise<number> {
    return this.savedProductRepository.count({
      where: { productId, deletedAt: IsNull() },
    });
  }

  // a saved row for a product id or an ad id (including soft-deleted ones)
  private findAny(buyerId: string, targetId: string) {
    return this.savedProductRepository.findOne({
      where: [
        { buyerId, productId: targetId },
        { buyerId, listingId: targetId },
      ],
    });
  }

  private findActive(buyerId: string, targetId: string) {
    return this.savedProductRepository.findOne({
      where: [
        { buyerId, productId: targetId, deletedAt: IsNull() },
        { buyerId, listingId: targetId, deletedAt: IsNull() },
      ],
    });
  }
}
