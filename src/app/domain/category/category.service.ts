import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Category } from './entities/category.entity';
import { IsNull, Repository } from 'typeorm';
import { CreateCategoryDto } from './dtos/create-category.dto';
import { AppLogger } from '../../logger/logger.service';
import slugify from 'slugify';
import { Product } from '../products/entities/product.entity';
import { CategoryQueryDto } from './dtos/category-query.dto';
import { QueryFilterProvider } from '../../common/providers/query-filter-provider';
import { PaginationProvider } from '../../common/pagination/providers/pagination.provider';

@Injectable()
export class CategoryService {
  constructor(
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    private readonly queryFilterProvider: QueryFilterProvider,
    private readonly paginationProvider: PaginationProvider,
    private readonly logger: AppLogger,
  ) {}

  /**
   * Get all main categories (sidebar / filters)
   */
  async getMainCatgories(): Promise<Category[]> {
    return this.categoryRepository.find({
      where: {
        isActive: true,
        parentId: IsNull(),
      },
      order: { sortOrder: 'ASC' },
    });
  }

  /**
   * Get featured categories (home page)
   */

  async getFeaturedCategories() {
    return this.categoryRepository.find({
      where: {
        isFeatured: true,
        isActive: true,
      },
    });
  }

  /**
   * Get subcategories
   */
  async getSubcategories(parentId: string): Promise<Category[]> {
    return this.categoryRepository.find({
      where: {
        parentId,
        isActive: true,
      },
      order: { sortOrder: 'ASC' },
    });
  }

  /**
   * Get category by ID
   */
  async getCategoryById(id: string): Promise<Category> {
    const category = await this.categoryRepository.findOne({
      where: { id },
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    return category;
  }

  /**
   * Get category by slug (SEO pages)
   */
  async getCategoryBySlug(slug: string): Promise<Category> {
    const category = await this.categoryRepository.findOne({
      where: { slug },
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    return category;
  }

  /**
   * Create category
   */
  async createCategory(
    createDto: CreateCategoryDto,
    adminId: string,
  ): Promise<Category> {
    const existing = await this.categoryRepository.findOne({
      where: { code: createDto.code },
    });

    if (existing) {
      throw new ConflictException('Category code already exists');
    }

    if (createDto.parentId) {
      const parent = await this.categoryRepository.findOne({
        where: { id: createDto.parentId },
      });

      if (!parent) {
        throw new BadRequestException('Parent category not found');
      }
    }

    const slug = this.generateSlug(createDto.name);

    const slugExists = await this.categoryRepository.findOne({
      where: { slug },
    });

    if (slugExists) {
      throw new ConflictException('Category slug already exists');
    }

    const category = this.categoryRepository.create({
      ...createDto,
      slug,
      isActive: true,
    });

    const saved = await this.categoryRepository.save(category);

    this.logger.log(`Category created by ${adminId}: ${saved.code}`);

    return saved;
  }

  /**
   * Update category
   */
  async updateCategory(
    id: string,
    updateDto: Partial<CreateCategoryDto>,
    adminId: string,
  ): Promise<Category> {
    const category = await this.getCategoryById(id);

    Object.assign(category, updateDto);

    const updated = await this.categoryRepository.save(category);

    this.logger.log(`Category updated by ${adminId}: ${updated.code}`);

    return updated;
  }

  /**
   * Soft delete category
   */
  async deleteCategory(id: string, adminId: string): Promise<void> {
    const category = await this.getCategoryById(id);

    const productCount = await this.productRepository.count({
      where: {
        categoryId: id,
      },
    });

    if (productCount > 0) {
      throw new ForbiddenException('Cannot delete category with products');
    }

    category.isActive = false;

    await this.categoryRepository.save(category);

    this.logger.log(`Category deleted by ${adminId}: ${category.code}`);
  }

  async searchCategory(query: CategoryQueryDto, baseUrl?: string) {
    let qb = this.categoryRepository.createQueryBuilder('category');

    if (query.parentId) {
      qb.andWhere('category.parentId = :parentId', {
        parentId: query.parentId,
      });
    }

    if (query.isFeatured !== undefined) {
      qb.andWhere('category.isFeatured = :isFeatured', {
        isFeatured: query.isFeatured,
      });
    }

    qb = this.queryFilterProvider.applyFilters(qb, query, {
      alias: 'category',
      searchableFields: ['name', 'code'],
      allowedSortFields: ['name', 'createdAt', 'sortOrder'],
      allowedBooleanFields: ['isActive'],
      dateField: 'createdAt',
    });

    return this.paginationProvider.paginateQuery(qb, query, baseUrl);
  }

  private generateSlug(name: string): string {
    return slugify(name, {
      lower: true,
      strict: true,
    });
  }
}
