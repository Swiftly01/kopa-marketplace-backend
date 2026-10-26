import {
  applyDecorators,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import type { Request } from 'express';
import multer from 'multer';
import { CurrentUser } from '../../../auth/decorators/current-user.decorator';
import { IsPublic } from '../../../auth/decorators/public.decorator';
import { Roles } from '../../../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../auth/guards/roles.guard';
import { UserRole } from '../../../common/enums/roles-enum';
import { SellerApprovedGuard } from '../../sellers/guards/seller-approved.guard';
import type { JwtUser } from '../../../common/types/request-with-user.interface';
import {
  MAX_PHOTO_SIZE_BYTES,
  MAX_PHOTOS_PER_LISTING,
} from '../constants/listing.constants';
import { CreateListingDto } from '../dtos/create-listing.dto';
import { ListingQueryDto, MyListingsQueryDto } from '../dtos/listing-query.dto';
import { ReorderImagesDto } from '../dtos/reorder-images.dto';
import { UpdateListingDto } from '../dtos/update-listing.dto';
import { ListingStatus } from '../enums/listing-status.enum';
import { ListingCategoryService } from '../services/listing-category.service';
import { ListingImageService } from '../services/listing-image.service';
import { ListingService } from '../services/listing.service';

const fullUrl = (req: Request) =>
  `${req.protocol}://${req.get('host')}${req.originalUrl}`;

// Only approved sellers may post: buyers get a 403 on the three posting steps
// (create draft, upload photos, submit). Everything else stays open to the owner.
const sellersOnly = () =>
  applyDecorators(
    UseGuards(RolesGuard, SellerApprovedGuard),
    Roles(UserRole.SELLER),
  );

// posting flow: pick category -> load form -> create draft -> add photos -> publish
@UseGuards(JwtAuthGuard)
@Controller('listings')
export class ListingController {
  constructor(
    private readonly listingService: ListingService,
    private readonly categoryService: ListingCategoryService,
    private readonly imageService: ListingImageService,
  ) {}

  // ---- posting flow ----

  @IsPublic()
  @Get('categories')
  async getPostableCategories() {
    const data = await this.categoryService.getPostableCategories();
    return { success: true, message: 'Categories fetched successfully', data };
  }

  @IsPublic()
  @Get('categories/:categoryId/form')
  async getForm(@Param('categoryId', ParseUUIDPipe) categoryId: string) {
    const data = await this.categoryService.getFormSchema(categoryId);
    return { success: true, message: 'Form fetched successfully', data };
  }

  @sellersOnly()
  @Post()
  async create(@CurrentUser() user: JwtUser, @Body() dto: CreateListingDto) {
    const data = await this.listingService.create(user.id, dto);
    return { success: true, message: 'Listing saved as draft', data };
  }

  @sellersOnly()
  @Post(':id/images')
  @UseInterceptors(
    FilesInterceptor('images', MAX_PHOTOS_PER_LISTING, {
      storage: multer.memoryStorage(),
      limits: { fileSize: MAX_PHOTO_SIZE_BYTES },
    }),
  )
  async addImages(
    @CurrentUser() user: JwtUser,
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    const data = await this.imageService.add(user.id, id, files);
    return { success: true, message: 'Photos uploaded', data };
  }

  @Patch(':id/images/order')
  async reorderImages(
    @CurrentUser() user: JwtUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReorderImagesDto,
  ) {
    const data = await this.imageService.reorder(user.id, id, dto.imageIds);
    return { success: true, message: 'Photos reordered', data };
  }

  @Delete(':id/images/:imageId')
  async removeImage(
    @CurrentUser() user: JwtUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('imageId', ParseUUIDPipe) imageId: string,
  ) {
    const data = await this.imageService.remove(user.id, id, imageId);
    return { success: true, message: 'Photo removed', data };
  }

  @sellersOnly()
  @Post(':id/publish')
  @HttpCode(HttpStatus.OK)
  async publish(
    @CurrentUser() user: JwtUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const data = await this.listingService.publish(user.id, id);
    const message =
      data.status === ListingStatus.ACTIVE
        ? 'Listing is live again'
        : 'Listing submitted for review';
    return { success: true, message, data };
  }

  @Post(':id/deactivate')
  @HttpCode(HttpStatus.OK)
  async deactivate(
    @CurrentUser() user: JwtUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const data = await this.listingService.deactivate(user.id, id);
    return { success: true, message: 'Listing paused', data };
  }

  // ---- owner reads / edits (static paths first so ':id' never swallows them) ----

  @Get('mine')
  async listMine(
    @CurrentUser() user: JwtUser,
    @Query() query: MyListingsQueryDto,
    @Req() req: Request,
  ) {
    const data = await this.listingService.listMine(
      user.id,
      query,
      fullUrl(req),
    );
    return { success: true, message: 'Listings fetched successfully', data };
  }

  @Get(':id')
  async getMine(
    @CurrentUser() user: JwtUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const data = await this.listingService.getOwned(user.id, id);
    return { success: true, message: 'Listing fetched successfully', data };
  }

  @Patch(':id')
  async update(
    @CurrentUser() user: JwtUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateListingDto,
  ) {
    const data = await this.listingService.update(user.id, id, dto);
    return { success: true, message: 'Listing updated', data };
  }

  @Delete(':id')
  async remove(
    @CurrentUser() user: JwtUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.listingService.remove(user.id, id);
    return { success: true, message: 'Listing deleted' };
  }

  // ---- public ----

  @IsPublic()
  @Get()
  async search(@Query() query: ListingQueryDto, @Req() req: Request) {
    const data = await this.listingService.search(query, fullUrl(req));
    return { success: true, message: 'Listings fetched successfully', data };
  }

  @IsPublic()
  @Get('slug/:slug')
  async getBySlug(@Param('slug') slug: string) {
    const data = await this.listingService.getPublicBySlug(slug);
    return { success: true, message: 'Listing fetched successfully', data };
  }
}
