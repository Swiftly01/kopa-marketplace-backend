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
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import type { Request } from 'express';
import multer from 'multer';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { MAX_PHOTO_SIZE_BYTES } from '../../listings/constants/listing.constants';
import { AMENITY_PRESETS, MAX_LODGE_PHOTOS } from '../constants/lodge.constants';
import { CurrentFamilyHouse } from '../decorators/current-family-house.decorator';
import { UpdateAvailabilityDto, CreateLodgeDto, UpdateLodgeDto } from '../dtos/lodge.dto';
import { LodgeManageQueryDto } from '../dtos/lodge-query.dto';
import {
  CreateBedSlotDto,
  CreatePickupBatchDto,
  GenerateBedSlotsDto,
  UpdateBedSlotDto,
  UpdateLodgeImageDto,
  UpdatePickupBatchDto,
  UpdatePickupDto,
} from '../dtos/lodge-setup.dto';
import { FamilyHouse } from '../entities/family-house.entity';
import {
  BedSlotStatus,
  BedWing,
  BookingStatus,
  BunkType,
  HouseRuleLevel,
  LodgeAvailability,
  LodgeStatus,
} from '../enums/lodge.enums';
import { FamilyHouseAdminGuard } from '../guards/family-house-admin.guard';
import { FamilyHouseService } from '../services/family-house.service';
import { LodgeBedSlotService } from '../services/lodge-bed-slot.service';
import { LodgeImageService } from '../services/lodge-image.service';
import { LodgePickupService } from '../services/lodge-pickup.service';
import { LodgeService } from '../services/lodge.service';
import { fullUrl } from '../utils/full-url';
import { scopeOfHouse } from '../utils/lodge-scope';

// the family house admin's own lodges; the house always comes from the guard, never the request
@UseGuards(JwtAuthGuard, FamilyHouseAdminGuard)
@Controller('family-house')
export class FamilyHouseLodgeController {
  constructor(
    private readonly houses: FamilyHouseService,
    private readonly lodges: LodgeService,
    private readonly images: LodgeImageService,
    private readonly bedSlots: LodgeBedSlotService,
    private readonly pickup: LodgePickupService,
  ) {}

  @Get('me')
  async me(@CurrentFamilyHouse() house: FamilyHouse) {
    const data = await this.houses.describe(house);
    return { success: true, message: 'Family house fetched successfully', data };
  }

  // presets and allowed values the setup wizard draws its controls from
  @Get('meta')
  meta() {
    return {
      success: true,
      message: 'Lodge options fetched successfully',
      data: {
        amenityPresets: AMENITY_PRESETS,
        wings: Object.values(BedWing),
        bunkTypes: Object.values(BunkType),
        bedSlotStatuses: Object.values(BedSlotStatus),
        lodgeStatuses: Object.values(LodgeStatus),
        availabilities: Object.values(LodgeAvailability),
        bookingStatuses: Object.values(BookingStatus),
        houseRuleLevels: Object.values(HouseRuleLevel),
      },
    };
  }

  // ---- lodges ----

  @Get('lodges')
  async list(
    @CurrentFamilyHouse() house: FamilyHouse,
    @Query() query: LodgeManageQueryDto,
    @Req() req: Request,
  ) {
    const data = await this.lodges.list(scopeOfHouse(house), query, fullUrl(req));
    return { success: true, message: 'Lodges fetched successfully', data };
  }

  @Post('lodges')
  async create(@CurrentFamilyHouse() house: FamilyHouse, @Body() dto: CreateLodgeDto) {
    const data = await this.lodges.create(house, dto);
    return { success: true, message: 'Lodge saved as draft', data };
  }

  @Get('lodges/:id')
  async get(
    @CurrentFamilyHouse() house: FamilyHouse,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const data = await this.lodges.get(scopeOfHouse(house), id);
    return { success: true, message: 'Lodge fetched successfully', data };
  }

  @Patch('lodges/:id')
  async update(
    @CurrentFamilyHouse() house: FamilyHouse,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateLodgeDto,
  ) {
    const data = await this.lodges.update(scopeOfHouse(house), id, dto);
    return { success: true, message: 'Lodge updated', data };
  }

  @Delete('lodges/:id')
  async archive(
    @CurrentFamilyHouse() house: FamilyHouse,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.lodges.archive(scopeOfHouse(house), id);
    return { success: true, message: 'Lodge archived' };
  }

  @Post('lodges/:id/publish')
  @HttpCode(HttpStatus.OK)
  async publish(
    @CurrentFamilyHouse() house: FamilyHouse,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const data = await this.lodges.publish(scopeOfHouse(house), id);
    return { success: true, message: 'Lodge is live', data };
  }

  @Post('lodges/:id/unpublish')
  @HttpCode(HttpStatus.OK)
  async unpublish(
    @CurrentFamilyHouse() house: FamilyHouse,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const data = await this.lodges.unpublish(scopeOfHouse(house), id);
    return { success: true, message: 'Lodge unpublished', data };
  }

  @Patch('lodges/:id/availability')
  async availability(
    @CurrentFamilyHouse() house: FamilyHouse,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAvailabilityDto,
  ) {
    const data = await this.lodges.setAvailability(
      scopeOfHouse(house),
      id,
      dto.availability,
    );
    return { success: true, message: 'Availability updated', data };
  }

  // ---- photos (wizard step 3) ----

  @Get('lodges/:id/images')
  async listImages(
    @CurrentFamilyHouse() house: FamilyHouse,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const data = await this.images.list(scopeOfHouse(house), id);
    return { success: true, message: 'Photos fetched successfully', data };
  }

  @Post('lodges/:id/images')
  @UseInterceptors(
    FilesInterceptor('images', MAX_LODGE_PHOTOS, {
      storage: multer.memoryStorage(),
      limits: { fileSize: MAX_PHOTO_SIZE_BYTES },
    }),
  )
  async addImages(
    @CurrentFamilyHouse() house: FamilyHouse,
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    const data = await this.images.add(scopeOfHouse(house), id, files);
    return { success: true, message: 'Photos uploaded', data };
  }

  @Patch('lodges/:id/images/:imageId')
  async updateImage(
    @CurrentFamilyHouse() house: FamilyHouse,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('imageId', ParseUUIDPipe) imageId: string,
    @Body() dto: UpdateLodgeImageDto,
  ) {
    const data = await this.images.update(scopeOfHouse(house), id, imageId, dto);
    return { success: true, message: 'Photo updated', data };
  }

  @Delete('lodges/:id/images/:imageId')
  async removeImage(
    @CurrentFamilyHouse() house: FamilyHouse,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('imageId', ParseUUIDPipe) imageId: string,
  ) {
    const data = await this.images.remove(scopeOfHouse(house), id, imageId);
    return { success: true, message: 'Photo removed', data };
  }

  // ---- bed slots (wizard step 2) ----

  @Get('lodges/:id/bed-slots')
  async listBedSlots(
    @CurrentFamilyHouse() house: FamilyHouse,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const data = await this.bedSlots.list(scopeOfHouse(house), id);
    return { success: true, message: 'Bed slots fetched successfully', data };
  }

  @Post('lodges/:id/bed-slots')
  async createBedSlot(
    @CurrentFamilyHouse() house: FamilyHouse,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateBedSlotDto,
  ) {
    const data = await this.bedSlots.create(scopeOfHouse(house), id, dto);
    return { success: true, message: 'Bed slot added', data };
  }

  // declared before ':slotId' routes so "generate" is never read as an id
  @Post('lodges/:id/bed-slots/generate')
  async generateBedSlots(
    @CurrentFamilyHouse() house: FamilyHouse,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: GenerateBedSlotsDto,
  ) {
    const data = await this.bedSlots.generate(scopeOfHouse(house), id, dto);
    return { success: true, message: 'Bed slots generated', data };
  }

  @Patch('lodges/:id/bed-slots/:slotId')
  async updateBedSlot(
    @CurrentFamilyHouse() house: FamilyHouse,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('slotId', ParseUUIDPipe) slotId: string,
    @Body() dto: UpdateBedSlotDto,
  ) {
    const data = await this.bedSlots.update(scopeOfHouse(house), id, slotId, dto);
    return { success: true, message: 'Bed slot updated', data };
  }

  @Delete('lodges/:id/bed-slots/:slotId')
  async removeBedSlot(
    @CurrentFamilyHouse() house: FamilyHouse,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('slotId', ParseUUIDPipe) slotId: string,
  ) {
    await this.bedSlots.remove(scopeOfHouse(house), id, slotId);
    return { success: true, message: 'Bed slot removed' };
  }

  // ---- camp pickup (wizard step 5) ----

  @Patch('lodges/:id/pickup')
  async updatePickup(
    @CurrentFamilyHouse() house: FamilyHouse,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePickupDto,
  ) {
    const data = await this.pickup.updateSettings(scopeOfHouse(house), id, dto);
    return { success: true, message: 'Pickup settings updated', data };
  }

  @Get('lodges/:id/pickup/batches')
  async listBatches(
    @CurrentFamilyHouse() house: FamilyHouse,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const data = await this.pickup.list(scopeOfHouse(house), id);
    return { success: true, message: 'Pickup batches fetched successfully', data };
  }

  @Post('lodges/:id/pickup/batches')
  async createBatch(
    @CurrentFamilyHouse() house: FamilyHouse,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreatePickupBatchDto,
  ) {
    const data = await this.pickup.createBatch(scopeOfHouse(house), id, dto);
    return { success: true, message: 'Pickup batch added', data };
  }

  @Patch('lodges/:id/pickup/batches/:batchId')
  async updateBatch(
    @CurrentFamilyHouse() house: FamilyHouse,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('batchId', ParseUUIDPipe) batchId: string,
    @Body() dto: UpdatePickupBatchDto,
  ) {
    const data = await this.pickup.updateBatch(scopeOfHouse(house), id, batchId, dto);
    return { success: true, message: 'Pickup batch updated', data };
  }

  @Delete('lodges/:id/pickup/batches/:batchId')
  async removeBatch(
    @CurrentFamilyHouse() house: FamilyHouse,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('batchId', ParseUUIDPipe) batchId: string,
  ) {
    const data = await this.pickup.removeBatch(scopeOfHouse(house), id, batchId);
    return { success: true, message: 'Pickup batch removed', data };
  }
}
