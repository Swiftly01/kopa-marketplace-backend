import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import multer from 'multer';
import { CurrentUser } from '../../../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import type { JwtUser } from '../../../common/types/request-with-user.interface';
import { CreateProductDto } from '../dtos/create-product-dto';
import { CreateProductWithImagesDto } from '../dtos/create-product-with-images-dto';
import { FilterSellerProductDto } from '../dtos/filter-seller-product-dto';
import { SearchProductFilterDto } from '../dtos/search-product-filter-dto';
import { ProductService } from '../services/product.service';
import type { Request } from 'express';
import { UserRole } from '../../../common/enums/roles-enum';
import { Roles } from '../../../auth/decorators/roles.decorator';
import { RolesGuard } from '../../../auth/guards/roles.guard';
import { SellerApprovedGuard } from '../../sellers/guards/seller-approved.guard';
import { IsPublic } from '../../../auth/decorators/public.decorator';

@UseGuards(JwtAuthGuard)
@Controller('products')
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  @IsPublic()
  @Get()
  async searchProducts(
    @Query() query: SearchProductFilterDto,
    @Req() req: Request,
  ) {
    const baseUrl = `${req.protocol}://${req.get('host')}${req.originalUrl}`;
    return this.productService.searchProducts(query, baseUrl);
  }

  @Get('seller')
  async getSellerProducts(
    @CurrentUser() user: JwtUser,
    @Query() query: FilterSellerProductDto,
    @Req() req: Request,
  ) {
    const baseUrl = `${req.protocol}://${req.get('host')}${req.originalUrl}`;
    return this.productService.getSellerProducts(user.id, query, baseUrl);
  }

  @Get('meta/categories')
  async getCategories() {
    return this.productService.getCategories();
  }

  @Get('meta/locations')
  async getLocations() {
    return this.productService.getLocations();
  }

  @Get('seller/stats')
  async getSellerStats(@CurrentUser() user: JwtUser) {
    return this.productService.getSellerStats(user.id);
  }

  // POST /products — create product record only
  @UseGuards(RolesGuard, SellerApprovedGuard)
  @Roles(UserRole.SELLER)
  @Post()
  async createProduct(
    @CurrentUser() user: JwtUser,
    @Body() dto: CreateProductDto,
  ) {
    const product = await this.productService.createProduct(user.id, dto);

    return {
      success: true,
      message: 'Product created successfully',
      data: {
        product,
      },
    };
  }

  // POST /products/with-images — combined flow (optional convenience route)
  @UseGuards(RolesGuard, SellerApprovedGuard)
  @Roles(UserRole.SELLER)
  @Post('with-images')
  @UseInterceptors(
    FilesInterceptor('images', 6, {
      storage: multer.memoryStorage(),
      limits: { fileSize: 1024 * 1024 },
    }),
  )
  async createProductWithImages(
    @CurrentUser() user: JwtUser,
    @Body() dto: CreateProductWithImagesDto,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    return this.productService.createProductWithImages(user.id, dto, files);
  }

  // PATCH /products/:productId — update fields only, no images
  @UseGuards(RolesGuard, SellerApprovedGuard)
  @Roles(UserRole.SELLER)
  @Patch(':productId')
  async updateProduct(
    @CurrentUser() user: JwtUser,
    @Param('productId') productId: string,
    @Body() dto: Partial<CreateProductDto>,
  ) {
    return this.productService.updateProduct(productId, user.id, dto);
  }

  // POST /products/:productId/images — add images (used after create or independently)
  @UseGuards(RolesGuard, SellerApprovedGuard)
  @Roles(UserRole.SELLER)
  @Post(':productId/images')
  @UseInterceptors(
    FilesInterceptor('images', 6, {
      storage: multer.memoryStorage(),
      limits: { fileSize: 1024 * 1024 },
    }),
  )
  async addImages(
    @CurrentUser() user: JwtUser,
    @Param('productId') productId: string,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    if (!files || files.length === 0) {
      throw new BadRequestException('No images uploaded');
    }

    return this.productService.addProductImages(
      productId,
      user.id,
      files.map((file) => ({
        buffer: file.buffer,
        filename: file.originalname,
      })),
    );
  }
  @UseGuards(RolesGuard, SellerApprovedGuard)
  @Roles(UserRole.SELLER)
  @Delete(':productId/images/:imageId')
  async deleteImage(
    @CurrentUser() user: JwtUser,
    @Param('productId') productId: string,
    @Param('imageId') imageId: string,
  ) {
    return this.productService.deleteProductImage(productId, user.id, imageId);
  }

  @IsPublic()
  @Get('slug/:slug')
  async getBySlug(@Param('slug') slug: string) {
    return this.productService.getProductBySlug(slug);
  }

  @Get('seller/:sellerId')
  public getPublicSellerProducts(
    @Param('sellerId') sellerId: string,
    @Query() query: FilterSellerProductDto,
    @Req() req: Request,
  ) {
    const baseUrl = `${req.protocol}://${req.get('host')}${req.originalUrl}`;
    return this.productService.getPublicSellerProducts(
      sellerId,
      query,
      baseUrl,
    );
  }

  @Get(':productId')
  async getProduct(@Param('productId') productId: string) {
    return this.productService.getProduct(productId);
  }

  @UseGuards(RolesGuard, SellerApprovedGuard)
  @Roles(UserRole.SELLER)
  @Delete(':productId')
  async deleteProduct(
    @CurrentUser() user: JwtUser,
    @Param('productId') productId: string,
  ) {
    return this.productService.deleteProduct(productId, user.id);
  }
}
