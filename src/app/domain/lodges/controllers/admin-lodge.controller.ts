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
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { Roles } from '../../../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../auth/guards/roles.guard';
import { UserRole } from '../../../common/enums/roles-enum';
import {
  AssignHouseAdminDto,
  CreateFamilyHouseDto,
  FamilyHouseQueryDto,
  UpdateFamilyHouseDto,
} from '../dtos/family-house.dto';
import { UpdateAvailabilityDto } from '../dtos/lodge.dto';
import {
  AdminLodgeQueryDto,
  BookingManageQueryDto,
} from '../dtos/lodge-query.dto';
import { FamilyHouseService } from '../services/family-house.service';
import { LodgeBookingService } from '../services/lodge-booking.service';
import { LodgeService } from '../services/lodge.service';
import { fullUrl } from '../utils/full-url';
import { ANY_HOUSE } from '../utils/lodge-scope';

// super admin: manages family houses and keeps oversight of every house's lodges
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('admin')
export class AdminLodgeController {
  constructor(
    private readonly houses: FamilyHouseService,
    private readonly lodges: LodgeService,
    private readonly bookings: LodgeBookingService,
  ) {}

  // ---- family houses ----

  @Post('family-houses')
  async createHouse(@Body() dto: CreateFamilyHouseDto) {
    const data = await this.houses.create(dto);
    return { success: true, message: 'Family house created', data };
  }

  @Get('family-houses')
  async listHouses(@Query() query: FamilyHouseQueryDto, @Req() req: Request) {
    const data = await this.houses.list(query, fullUrl(req));
    return {
      success: true,
      message: 'Family houses fetched successfully',
      data,
    };
  }

  // dashboard cards; static path first so ':id' never swallows it
  @Get('family-houses/stats')
  async houseStats() {
    const data = await this.houses.stats();
    return {
      success: true,
      message: 'Family house stats fetched successfully',
      data,
    };
  }

  @Get('family-houses/:id')
  async getHouse(@Param('id', ParseUUIDPipe) id: string) {
    const data = await this.houses.get(id);
    return {
      success: true,
      message: 'Family house fetched successfully',
      data,
    };
  }

  @Patch('family-houses/:id')
  async updateHouse(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateFamilyHouseDto,
  ) {
    const data = await this.houses.update(id, dto);
    return { success: true, message: 'Family house updated', data };
  }

  @Put('family-houses/:id/admin')
  async assignAdmin(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AssignHouseAdminDto,
  ) {
    const data = await this.houses.assignAdmin(id, dto.userId);
    return { success: true, message: 'House admin assigned', data };
  }

  @Delete('family-houses/:id/admin')
  async removeAdmin(@Param('id', ParseUUIDPipe) id: string) {
    const data = await this.houses.removeAdmin(id);
    return { success: true, message: 'House admin removed', data };
  }

  // ---- lodges of every house ----

  @Get('lodges')
  async listLodges(@Query() query: AdminLodgeQueryDto, @Req() req: Request) {
    const data = await this.lodges.list(ANY_HOUSE, query, fullUrl(req));
    return { success: true, message: 'Lodges fetched successfully', data };
  }

  // static path first so ':id' never swallows it
  @Get('lodges/bookings')
  async listBookings(
    @Query() query: BookingManageQueryDto,
    @Req() req: Request,
  ) {
    const data = await this.bookings.list(ANY_HOUSE, query, fullUrl(req));
    return { success: true, message: 'Bookings fetched successfully', data };
  }

  @Get('lodges/:id')
  async getLodge(@Param('id', ParseUUIDPipe) id: string) {
    const data = await this.lodges.get(ANY_HOUSE, id);
    return { success: true, message: 'Lodge fetched successfully', data };
  }

  // takedown of a live lodge
  @Post('lodges/:id/unpublish')
  @HttpCode(HttpStatus.OK)
  async unpublish(@Param('id', ParseUUIDPipe) id: string) {
    const data = await this.lodges.unpublish(ANY_HOUSE, id);
    return { success: true, message: 'Lodge unpublished', data };
  }

  @Patch('lodges/:id/availability')
  async availability(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAvailabilityDto,
  ) {
    const data = await this.lodges.setAvailability(
      ANY_HOUSE,
      id,
      dto.availability,
    );
    return { success: true, message: 'Availability updated', data };
  }

  @Delete('lodges/:id')
  async archive(@Param('id', ParseUUIDPipe) id: string) {
    await this.lodges.archive(ANY_HOUSE, id);
    return { success: true, message: 'Lodge archived' };
  }
}
