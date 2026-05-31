import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import slugify from 'slugify';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { CloudinaryService } from '../../../cloudinary/cloudinary.service';
import { PaginationProvider } from '../../../common/pagination/providers/pagination.provider';
import { QueryFilterProvider } from '../../../common/providers/query-filter-provider';
import { AppLogger } from '../../../logger/logger.service';
import { LocationService } from '../../location/location.service';
import { CreateProductDto } from '../dtos/create-product-dto';
import { CreateProductWithImagesDto } from '../dtos/create-product-with-images-dto';
import { FilterSellerProductDto } from '../dtos/filter-seller-product-dto';
import { ProductResponseDto } from '../dtos/product-response.dto';
import { SearchProductFilterDto } from '../dtos/search-product-filter-dto';
import { ProductImage } from '../entities/product-image.entity';
import { Product } from '../entities/product.entity';
import { ProductStatus } from '../enums/product-status.enum';

@Injectable()
export class ProductService {
  private readonly context = ProductService.name;

  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(ProductImage)
    private readonly productImageRepository: Repository<ProductImage>,
    private readonly cloudinaryService: CloudinaryService,
    private readonly queryFilterProvider: QueryFilterProvider,
    private readonly paginateProvider: PaginationProvider,
    private readonly locationService: LocationService,
    private readonly logger: AppLogger,
  ) {}

  async createProduct(
    sellerId: string,
    createDto: CreateProductDto,
    autoPublish: boolean = true,
  ): Promise<ProductResponseDto> {
    this.logger.log(`Creating product for seller ${sellerId}`);

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const product = await this._createProductRecord(
        queryRunner.manager,
        createDto,
        sellerId,
      );

      if (autoPublish) {
        product.status = ProductStatus.ACTIVE;
        product.isActive = true;
        await queryRunner.manager.save(Product, product);
      }

      await queryRunner.commitTransaction();

      this.logger.log(`Product created: ${product.id}`);

      const createdProduct = await this.productRepository.findOne({
        where: { id: product.id },
        relations: ['images', 'seller'],
      });

      if (!createdProduct) {
        throw new NotFoundException('Product not found after creation');
      }

      return this.mapToProductResponse(createdProduct);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(
        `Product creation failed: ${error instanceof Error ? error.message : 'unknown'}`,
      );
      throw error instanceof ConflictException
        ? error
        : new InternalServerErrorException('Failed to create product');
    } finally {
      await queryRunner.release();
    }
  }

  async createProductWithImages(
    sellerId: string,
    createDto: CreateProductWithImagesDto,
    files: Express.Multer.File[],
    autoPublish = false,
  ) {
    if (!files || files.length === 0) {
      throw new BadRequestException('At least 1 image is required');
    }

    if (files.length > 6) {
      throw new BadRequestException('Maximum 6 images allowed');
    }

    const product = await this.createProduct(sellerId, createDto, autoPublish);

    if (!product) {
      throw new InternalServerErrorException('Failed to create product');
    }

    const imagePayload = files.map((file) => ({
      buffer: file.buffer,
      filename: file.originalname,
    }));

    await this.addProductImages(product.id, sellerId, imagePayload);

    return this.productRepository.findOne({
      where: { id: product.id },
      relations: ['images', 'seller'],
    });
  }

  async updateProduct(
    productId: string,
    sellerId: string,
    updateData: Partial<CreateProductDto>, // <-- no longer accepts images
  ): Promise<Product | null> {
    const product = await this.getProduct(productId, sellerId);

    if (updateData.name !== undefined) {
      if (updateData.name.trim().length < 3) {
        throw new BadRequestException(
          'Product name must be at least 3 characters',
        );
      }
      product.name = updateData.name.trim();
      product.slug = this.generateSlug(updateData.name);
    }

    if (updateData.description !== undefined) {
      product.description = updateData.description?.trim();
    }

    if (updateData.categoryId !== undefined) {
      product.categoryId = updateData.categoryId;
    }
    if (updateData.price !== undefined && updateData.price > 0) {
      product.price = updateData.price;
    }

    if (updateData.discountPercentage !== undefined) {
      if (
        updateData.discountPercentage < 0 ||
        updateData.discountPercentage > 100
      ) {
        throw new BadRequestException('Discount must be between 0 and 100');
      }
      product.discountPercentage = updateData.discountPercentage;
    }

    if (updateData.stock !== undefined && updateData.stock >= 0) {
      product.stock = updateData.stock;
    }

    if (updateData.condition !== undefined) {
      product.condition = updateData.condition;
    }

    if (updateData.stateCode !== undefined) {
      product.stateCode = updateData.stateCode;
    }

    if (updateData.stateName !== undefined) {
      product.stateName = updateData.stateName;
    }

    if (updateData.lgaName !== undefined) {
      product.lgaName = updateData.lgaName;
    }

    if (updateData.attributes !== undefined) {
      product.attributes = updateData.attributes;
    }

    await this.productRepository.save(product);

    this.logger.log(`Product updated: ${productId}`);

    return this.productRepository.findOne({
      where: { id: productId },
      relations: ['images'],
    });
  }

  async addProductImages(
    productId: string,
    sellerId: string,
    images: { buffer: Buffer; filename: string }[],
  ) {
    if (!images || images.length === 0) {
      throw new BadRequestException('No images provided');
    }

    if (images.length > 6) {
      throw new BadRequestException('Cannot upload more than 6 images at once');
    }

    const product = await this.getProduct(productId, sellerId);

    const existingCount = await this.productImageRepository.count({
      where: { productId },
    });

    const total = existingCount + images.length;

    if (total > 6) {
      throw new BadRequestException(
        `Max 6 images allowed. You already have ${existingCount}`,
      );
    }

    let order = existingCount + 1;
    const uploadedPublicIds: string[] = [];

    try {
      for (const image of images) {
        this.cloudinaryService.validateFile(image.buffer, image.filename, 2);

        const upload = await this.cloudinaryService.uploadFile(
          image.buffer,
          image.filename,
          `products/${sellerId}`,
          ['product', product.id],
        );

        uploadedPublicIds.push(upload.publicId);

        const newImage = this.productImageRepository.create({
          productId: product.id,
          cloudinaryUrl: upload.secureUrl,
          cloudinaryPublicId: upload.publicId,
          order,
          filename: image.filename,
          isMain: existingCount === 0 && order === 1,
          format: upload.format,
        });

        await this.productImageRepository.save(newImage);
        order++;
      }

      return { message: 'Images added successfully' };
    } catch (error) {
      // cleanup cloudinary if failed
      for (const id of uploadedPublicIds) {
        try {
          await this.cloudinaryService.deleteFile(id);
        } catch (error) {
          if (error instanceof Error) {
            this.logger.log(`Failed  to delete image: ${id}`, error.message);
          } else {
            this.logger.log(`Failed  to delete image`);
          }
        }
      }
      if (error instanceof Error) {
        throw new InternalServerErrorException(
          `Failed to upload images: ${error.message}`,
        );
      } else {
        throw new InternalServerErrorException('Failed to upload images');
      }
    }
  }

  async deleteProductImage(
    productId: string,
    sellerId: string,
    imageId: string,
  ) {
    await this.getProduct(productId, sellerId);

    const image = await this.productImageRepository.findOne({
      where: { id: imageId, productId },
    });

    if (!image) {
      throw new NotFoundException('Image not found');
    }

    const total = await this.productImageRepository.count({
      where: { productId },
    });

    if (total <= 1) {
      throw new BadRequestException('Product must have at least one image');
    }

    try {
      await this.cloudinaryService.deleteFile(image.cloudinaryPublicId);
    } catch {
      this.logger.warn(`Cloudinary delete failed for ${image.id}`);
    }

    await this.productImageRepository.delete(image.id);

    await this.normalizeImageOrder(productId);

    return { message: 'Image deleted successfully' };
  }

  async getSellerProducts(
    sellerId: string,
    query: FilterSellerProductDto,
    baseUrl?: string,
  ) {
    this.logger.log(
      { message: 'Get sellers products', data: query },
      this.context,
    );

    let qb = this.productRepository
      .createQueryBuilder('product')
      .where('product.sellerId = :sellerId', { sellerId })
      .andWhere('product.status != :removed', {
        removed: ProductStatus.REMOVED,
      })
      .leftJoinAndSelect('product.seller', 'seller')
      .leftJoinAndSelect('product.images', 'images')
      .leftJoinAndSelect('product.category', 'category');

    qb = this.queryFilterProvider.applyFilters(qb, query, {
      alias: 'product',

      searchableFields: ['name', 'category'],

      allowedSortFields: ['name', 'price', 'createdAt'],

      allowedBooleanFields: ['isActive'],

      allowedEnumFields: {
        status: Object.values(ProductStatus),
      },

      dateField: 'createdAt',
    });

    return this.paginateProvider.paginateQuery(qb, query, baseUrl);
  }

  async getPublicSellerProducts(
    sellerId: string,
    query: FilterSellerProductDto,
    baseUrl?: string,
  ) {
    let qb = this.createProductBaseQuery()
      .where('product.sellerId = :sellerId', { sellerId })
      .andWhere('product.status = :status', {
        status: ProductStatus.ACTIVE,
      });

    qb = this.queryFilterProvider.applyFilters(qb, query, {
      alias: 'product',
      searchableFields: ['name'],
      allowedSortFields: ['name', 'price', 'createdAt'],
      dateField: 'createdAt',
    });

    return this.paginateProvider.paginateQuery(qb, query, baseUrl);
  }

  private createProductBaseQuery() {
    return this.productRepository
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.seller', 'seller')
      .leftJoinAndSelect('product.images', 'images')
      .leftJoinAndSelect('product.category', 'category');
  }

  private async normalizeImageOrder(productId: string) {
    const images = await this.productImageRepository.find({
      where: { productId },
      order: { order: 'ASC' },
    });

    let i = 1;

    for (const img of images) {
      img.order = i;
      await this.productImageRepository.save(img);
      i++;
    }
  }

  async getProduct(productId: string, sellerId?: string): Promise<Product> {
    const product = await this.productRepository.findOne({
      where: { id: productId, status: ProductStatus.ACTIVE, isActive: true },
      relations: ['images', 'category'],
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    // Check ownership if seller ID provided
    if (sellerId && product.sellerId !== sellerId) {
      throw new ForbiddenException('You can only edit your own products');
    }

    if (!sellerId) {
      product.views = (product.views || 0) + 1;
      await this.productRepository.save(product);
    }

    return product;
  }

  private async _createProductRecord(
    manager: EntityManager,
    createDto: CreateProductDto,
    sellerId: string,
  ): Promise<Product> {
    if (createDto.sku) {
      const existing = await manager.findOne(Product, {
        where: { sku: createDto.sku },
      });
      if (existing) {
        throw new ConflictException(
          `Product with SKU ${createDto.sku} already exists`,
        );
      }
    }

    const baseSlug = slugify(createDto.name, { lower: true });

    let slug = baseSlug;

    let counter = 1;

    while (await this.productRepository.findOne({ where: { slug } })) {
      slug = `${baseSlug}-${counter++}`;
    }

    const product = manager.create(Product, {
      name: createDto.name,
      description: createDto.description,
      categoryId: createDto.categoryId,
      stateName: createDto.stateName,
      stateCode: createDto.stateCode,
      lgaName: createDto.lgaName,
      price: createDto.price,
      discountPercentage: createDto.discountPercentage,
      stock: createDto.stock,
      sku: createDto.sku,
      attributes: createDto.attributes,
      seller: { id: sellerId },
      slug,
      status: ProductStatus.DRAFT,
      isActive: true,
      condition: createDto.condition,
    });

    return manager.save(Product, product);
  }

  async searchProducts(filters: SearchProductFilterDto, baseUrl?: string) {
    let qb = this.productRepository
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.images', 'images')
      .leftJoinAndSelect('product.category', 'category')
      .where('product.status = :status', { status: ProductStatus.ACTIVE })
      .andWhere('product.isActive = :isActive', { isActive: true })
      .andWhere('product.stock > :stock', { stock: 0 });

    // ── Seller scope ─────────────────────────────────────────────────────────
    // When sellerId is supplied (e.g. a seller browsing their own store page),
    // restrict results to that seller only.
    if (filters.sellerId) {
      qb.andWhere('product.sellerId = :sellerId', {
        sellerId: filters.sellerId,
      });
    }

    // ── Filter engine ─────────────────────────────────────────────────────────
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

    if (filters.stateName) {
      qb.andWhere('product.stateName = :stateName', {
        stateName: filters.stateName,
      });
    }

    if (filters.stateCode) {
      qb.andWhere('product.stateCode = :stateCode', {
        stateCode: filters.stateCode,
      });
    }

    if (filters.lgaName) {
      qb.andWhere('product.lgaName = :lgaName', {
        lgaName: filters.lgaName,
      });
    }

    if (filters.condition) {
      qb.andWhere('product.condition = :condition', {
        condition: filters.condition,
      });
    }

    if (filters.categoryId) {
      qb.andWhere('category.id = :categoryId', {
        categoryId: filters.categoryId,
      });
    }

    if (filters.categorySlug) {
      qb.andWhere('category.slug = :slug', {
        slug: filters.categorySlug,
      });
    }

    if (filters.minPrice !== undefined) {
      qb.andWhere('product.price >= :minPrice', {
        minPrice: filters.minPrice,
      });
    }

    if (filters.maxPrice !== undefined) {
      qb.andWhere('product.price <= :maxPrice', {
        maxPrice: filters.maxPrice,
      });
    }

    return this.paginateProvider.paginateQuery(qb, filters, baseUrl);
  }

  async getCategories(): Promise<string[]> {
    const result = await this.productRepository
      .createQueryBuilder('product')
      .select('DISTINCT product.category', 'category')
      .where('product.status = :status', {
        status: ProductStatus.ACTIVE,
      })
      .andWhere('product.isActive = :isActive', {
        isActive: true,
      })
      .orderBy('product.category', 'ASC')
      .getRawMany<{ category: string }>();

    return result
      .map((r) => r.category)
      .filter((category): category is string => Boolean(category));
  }

  async getLocations(): Promise<string[]> {
    const result = await this.productRepository
      .createQueryBuilder('product')
      .select('DISTINCT product.location', 'location')
      .where('product.status = :status', {
        status: ProductStatus.ACTIVE,
      })
      .andWhere('product.isActive = :isActive', {
        isActive: true,
      })
      .orderBy('product.location', 'ASC')
      .getRawMany<{ location: string }>();

    return result
      .map((r) => r.location)
      .filter((location): location is string => Boolean(location?.trim()));
  }

  async getProductBySlug(slug: string): Promise<Product> {
    const product = await this.productRepository.findOne({
      where: { slug, status: ProductStatus.ACTIVE, isActive: true },
      relations: ['images', 'category', 'seller'],
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    // Increment view count
    product.views = (product.views || 0) + 1;
    await this.productRepository.save(product);

    return product;
  }

  async getSellerStats(sellerId: string): Promise<{
    totalProducts: number;
    activeProducts: number;
    draftProducts: number;
    inactiveProducts: number;
    totalViews: number;
    totalStock: number;
  }> {
    type SellerStatsRaw = {
      totalProducts: string;
      activeProducts: string;
      draftProducts: string;
      inactiveProducts: string;
      totalViews: string;
      totalStock: string;
    };

    const result = await this.productRepository
      .createQueryBuilder('product')
      .select([
        'COUNT(product.id) AS "totalProducts"',

        `COUNT(CASE WHEN product.status = :active THEN 1 END) AS "activeProducts"`,
        `COUNT(CASE WHEN product.status = :draft THEN 1 END) AS "draftProducts"`,
        `COUNT(CASE WHEN product.status = :inactive THEN 1 END) AS "inactiveProducts"`,

        'COALESCE(SUM(product.views), 0) AS "totalViews"',
        `COALESCE(
  SUM(CASE WHEN product.status = :active AND product.isActive = true THEN product.stock ELSE 0 END),
  0
) AS "totalStock"`,
      ])
      .where('product.sellerId = :sellerId', { sellerId })
      .setParameters({
        active: ProductStatus.ACTIVE,
        draft: ProductStatus.DRAFT,
        inactive: ProductStatus.INACTIVE,
      })
      .getRawOne<SellerStatsRaw>();

    return {
      totalProducts: Number(result?.totalProducts || 0),
      activeProducts: Number(result?.activeProducts || 0),
      draftProducts: Number(result?.draftProducts || 0),
      inactiveProducts: Number(result?.inactiveProducts || 0),
      totalViews: Number(result?.totalViews || 0),
      totalStock: Number(result?.totalStock || 0),
    };
  }

  async deleteProduct(productId: string, sellerId: string): Promise<void> {
    const product = await this.getProduct(productId, sellerId);

    product.status = ProductStatus.REMOVED;
    product.isActive = false;
    product.deletedAt = new Date();

    if (product.images && product.images.length > 0) {
      for (const image of product.images) {
        await this.cloudinaryService.deleteFile(image.cloudinaryPublicId);
      }
    }

    await this.productRepository.save(product);

    this.logger.log(
      `Product deleted (soft): ${productId} by seller ${sellerId}`,
    );
  }

  private generateSlug(name: string): string {
    return slugify(name, {
      lower: true,
      strict: true,
    });
  }

  private mapToProductResponse(product: Product): ProductResponseDto {
    return {
      id: product.id,
      name: product.name,
      slug: product.slug,
      description: product.description,
      price: Number(product.price),
      stock: product.stock,

      seller: {
        id: product.seller.id,
        firstName: product.seller.firstName,
        lastName: product.seller.lastName,
        email: product.seller.email,
        phoneNumber: product.seller.phoneNumber,
      },

      images:
        product.images?.map((image) => {
          return {
            id: image.id,
            url: image.cloudinaryUrl,
            fileName: image.filename,
            order: image.order,
          };
        }) || [],
    };
  }
}
