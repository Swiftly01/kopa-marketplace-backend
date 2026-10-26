import {
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
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { CurrentUser } from '../../../auth/decorators/current-user.decorator';
import { Roles } from '../../../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../auth/guards/roles.guard';
import { UserRole } from '../../../common/enums/roles-enum';
import type { JwtUser } from '../../../common/types/request-with-user.interface';
import { AdminListingQueryDto } from '../dtos/admin-listing-query.dto';
import { RejectListingDto } from '../dtos/reject-listing.dto';
import { ReorderImagesDto } from '../dtos/reorder-images.dto';
import { UpdateListingDto } from '../dtos/update-listing.dto';
import { ListingImageService } from '../services/listing-image.service';
import { ListingModerationService } from '../services/listing-moderation.service';
import { ListingService } from '../services/listing.service';

const fullUrl = (req: Request) =>
  `${req.protocol}://${req.get('host')}${req.originalUrl}`;

// admin review of ads: queue, approve, reject, edit
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('admin/listings')
export class AdminListingController {
  constructor(
    private readonly moderation: ListingModerationService,
    private readonly listingService: ListingService,
    private readonly imageService: ListingImageService,
  ) {}

  @Get()
  async list(@Query() query: AdminListingQueryDto, @Req() req: Request) {
    const data = await this.moderation.list(query, fullUrl(req));
    return { success: true, message: 'Listings fetched successfully', data };
  }

  // static path before ':id' so it is never read as an id
  @Get('stats')
  async stats() {
    const data = await this.moderation.stats();
    return { success: true, message: 'Listing stats fetched', data };
  }

  @Get(':id')
  async get(@Param('id', ParseUUIDPipe) id: string) {
    const data = await this.listingService.getForAdmin(id);
    return { success: true, message: 'Listing fetched successfully', data };
  }

  @Patch(':id')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateListingDto,
  ) {
    const data = await this.listingService.adminUpdate(id, dto);
    return { success: true, message: 'Listing updated', data };
  }

  @Post(':id/approve')
  @HttpCode(HttpStatus.OK)
  async approve(
    @CurrentUser() admin: JwtUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const data = await this.moderation.approve(admin.id, id);
    return { success: true, message: 'Listing approved', data };
  }

  @Post(':id/reject')
  @HttpCode(HttpStatus.OK)
  async reject(
    @CurrentUser() admin: JwtUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RejectListingDto,
  ) {
    const data = await this.moderation.reject(admin.id, id, dto.reason);
    return { success: true, message: 'Listing rejected', data };
  }

  @Patch(':id/images/order')
  async reorderImages(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReorderImagesDto,
  ) {
    const data = await this.imageService.reorder(null, id, dto.imageIds);
    return { success: true, message: 'Photos reordered', data };
  }

  @Delete(':id/images/:imageId')
  async removeImage(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('imageId', ParseUUIDPipe) imageId: string,
  ) {
    const data = await this.imageService.remove(null, id, imageId);
    return { success: true, message: 'Photo removed', data };
  }
}
