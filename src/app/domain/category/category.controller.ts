import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { IsPublic } from '../../auth/decorators/public.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import type { JwtUser } from '../../common/types/request-with-user.interface';
import { AppLogger } from '../../logger/logger.service';
import { CategoryService } from './category.service';
import { CategoryQueryDto } from './dtos/category-query.dto';
import { CreateCategoryDto } from './dtos/create-category.dto';
//import { Roles } from '../../auth/decorators/roles.decorator';
//import { UserRole } from '../../common/enums/roles-enum';

@UseGuards(JwtAuthGuard)
@Controller('category')
export class CategoryController {
  constructor(
    private readonly categoryService: CategoryService,
    private readonly logger: AppLogger,
  ) {}

  /**
   * Get all categories (basic filtering)
   */

  @Get()
  @IsPublic()
  async getCategories(@Query() query: CategoryQueryDto, @Req() req: Request) {
    const baseUrl = `${req.protocol}://${req.get('host')}${req.originalUrl}`;

    const data = await this.categoryService.searchCategory(query, baseUrl);

    return {
      success: true,
      message: 'Categories fetched successfully',
      data,
    };
  }

  /**
   * Get main categories (for UI sidebar / filters)
   */
  @Get('main')
  @IsPublic()
  async getMainCategories() {
    const categories = await this.categoryService.getMainCatgories();

    return {
      success: true,
      message: 'Main categories fetched',
      data: { categories },
    };
  }

  /**
   * Get featured categories (homepage)
   */
  @Get('featured')
  @IsPublic()
  async getFeaturedCategories() {
    const categories = await this.categoryService.getFeaturedCategories();

    return {
      success: true,
      message: 'Featured categories fetched',
      data: { categories },
    };
  }

  @Get(':id/subcategories')
  @IsPublic()
  async getSubCategories(@Param('id') id: string) {
    const categories = await this.categoryService.getSubcategories(id);
    return {
      success: true,
      message: 'Subcategories fetched',
      data: { categories },
    };
  }

  /**
   * Get single category
   */
  @Get(':id')
  @IsPublic()
  async getCategory(@Param('id') id: string) {
    const category = await this.categoryService.getCategoryById(id);

    return {
      success: true,
      message: 'Category fetched',
      data: { category },
    };
  }

  /**
   * Create category
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createCategory(
    @Body() dto: CreateCategoryDto,
    @CurrentUser() user: JwtUser,
  ) {
    const category = await this.categoryService.createCategory(dto, user.id);

    return {
      success: true,
      message: 'Category created successfully',
      data: { category },
    };
  }

  /**
   * Update category
   */
  @Patch(':id')
  async updateCategory(
    @Param('id') id: string,
    @Body() dto: Partial<CreateCategoryDto>,
    @CurrentUser() user: JwtUser,
  ) {
    const category = await this.categoryService.updateCategory(
      id,
      dto,
      user.id,
    );

    return {
      success: true,
      message: 'Category updated successfully',
      data: { category },
    };
  }

  /**
   * Delete category (soft delete)
   */
  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async deleteCategory(@Param('id') id: string, @CurrentUser() user: JwtUser) {
    await this.categoryService.deleteCategory(id, user.id);

    return {
      success: true,
      message: 'Category deleted successfully',
    };
  }
}
