import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { SavedProduct } from './entities/saved-product.entity';
import { IsNull, Repository } from 'typeorm';
import { Product } from '../products/entities/product.entity';
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

    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    private readonly queryFilterProvider: QueryFilterProvider,
    private readonly paginateProvider: PaginationProvider,

    private readonly logger: AppLogger,
  ) {}

  async saveProduct(buyerId: string, dto: SavedProductDto) {
    const { productId, note } = dto;

    const product = await this.productRepository.findOne({
      where: {
        id: productId,
        status: ProductStatus.ACTIVE,
        isActive: true,
      },
      relations: ['images', 'category'],
    });

    if (!product) {
      throw new NotFoundException(
        'Product not found or is no longer available',
      );
    }

    const existing = await this.savedProductRepository.findOne({
      where: { buyerId, productId },
    });

    if (existing) {
      if (existing.deletedAt === null) {
        throw new ConflictException('You hav already saved this product');
      }

      // Re-save: restore the soft-deleted row
      existing.deletedAt = null;
      existing.note = note ?? null;
      const restored = await this.savedProductRepository.save(existing);
      this.logger.log(`Buyer ${buyerId} re-saved product ${productId}`);

      return restored;
    }

    const saved = this.savedProductRepository.create({
      buyerId,
      productId,
      note: note ?? null,
    });

    const result = await this.savedProductRepository.save(saved);
    this.logger.log(`Buyer ${buyerId} saved product ${productId}`);

    return result;
  }

  async unsaveProduct(buyerId: string, productId: string): Promise<void> {
    const saved = await this.savedProductRepository.findOne({
      where: { buyerId, productId, deletedAt: IsNull() },
    });

    if (!saved) {
      throw new NotFoundException('Saved product not found');
    }

    saved.deletedAt = new Date();
    await this.savedProductRepository.save(saved);
    this.logger.log(`Buyer ${buyerId} unsaved product ${productId}`);
  }

  async toggleSave(
    buyerId: string,
    productId: string,
  ): Promise<{ isSaved: boolean }> {
    const existing = await this.savedProductRepository.findOne({
      where: { buyerId, productId, deletedAt: IsNull() },
    });

    if (existing) {
      await this.unsaveProduct(buyerId, productId);
      return { isSaved: false };
    }

    const product = await this.productRepository.findOne({
      where: { id: productId, status: ProductStatus.ACTIVE, isActive: true },
    });

    if (!product) {
      throw new NotFoundException(
        'Product not found or is no longer available',
      );
    }

    await this.saveProduct(buyerId, { productId });
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

  async getSaveStatus(buyerId: string, productId: string) {
    const saved = await this.savedProductRepository.findOne({
      where: { buyerId, productId, deletedAt: IsNull() },
      select: ['id'],
    });

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
}
