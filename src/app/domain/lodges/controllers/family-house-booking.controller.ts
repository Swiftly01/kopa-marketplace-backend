import {
  Body,
  Controller,
  Get,
  Header,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { CurrentUser } from '../../../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import type { JwtUser } from '../../../common/types/request-with-user.interface';
import { CurrentFamilyHouse } from '../decorators/current-family-house.decorator';
import {
  AssignBedDto,
  ManualBookingDto,
  RejectBookingDto,
} from '../dtos/lodge-booking.dto';
import { BroadcastDto } from '../dtos/lodge-desk.dto';
import { TransitActionDto } from '../dtos/lodge-logistics.dto';
import { BookingManageQueryDto, LodgeIdQueryDto } from '../dtos/lodge-query.dto';
import { FamilyHouse } from '../entities/family-house.entity';
import { FamilyHouseAdminGuard } from '../guards/family-house-admin.guard';
import { LodgeBookingService } from '../services/lodge-booking.service';
import { LodgeDeskService } from '../services/lodge-desk.service';
import { LodgeInventoryService } from '../services/lodge-inventory.service';
import { LodgeTransitService } from '../services/lodge-transit.service';
import { fullUrl } from '../utils/full-url';
import { scopeOfHouse } from '../utils/lodge-scope';

// bookings and the corpers list of the house admin's own lodges
@UseGuards(JwtAuthGuard, FamilyHouseAdminGuard)
@Controller('family-house/bookings')
export class FamilyHouseBookingController {
  constructor(
    private readonly bookings: LodgeBookingService,
    private readonly desk: LodgeDeskService,
    private readonly inventory: LodgeInventoryService,
    private readonly transit: LodgeTransitService,
  ) {}

  // headline numbers for the verification desk
  @Get('summary')
  async summary(
    @CurrentFamilyHouse() house: FamilyHouse,
    @Query() query: LodgeIdQueryDto,
  ) {
    const data = await this.desk.summary(scopeOfHouse(house), query.lodgeId);
    return { success: true, message: 'Desk summary fetched successfully', data };
  }

  // manifest download for the current filter (page and limit are ignored)
  @Get('export')
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @Header('Content-Disposition', 'attachment; filename="lodge-manifest.csv"')
  exportManifest(
    @CurrentFamilyHouse() house: FamilyHouse,
    @Query() query: BookingManageQueryDto,
  ) {
    return this.desk.exportCsv(scopeOfHouse(house), query);
  }

  // "+ Manual Entry": a walk-in, confirmed straight away
  @Post()
  async manualEntry(
    @CurrentUser() user: JwtUser,
    @CurrentFamilyHouse() house: FamilyHouse,
    @Body() dto: ManualBookingDto,
  ) {
    const data = await this.bookings.createManual(scopeOfHouse(house), user.id, dto);
    return { success: true, message: 'Corper added', data };
  }

  @Post('broadcast')
  @HttpCode(HttpStatus.OK)
  async broadcast(@CurrentFamilyHouse() house: FamilyHouse, @Body() dto: BroadcastDto) {
    const data = await this.desk.broadcast(scopeOfHouse(house), dto);
    return { success: true, message: 'Broadcast sent', data };
  }

  @Get()
  async list(
    @CurrentFamilyHouse() house: FamilyHouse,
    @Query() query: BookingManageQueryDto,
    @Req() req: Request,
  ) {
    const data = await this.bookings.list(scopeOfHouse(house), query, fullUrl(req));
    return { success: true, message: 'Bookings fetched successfully', data };
  }

  // static path first so ':id' never swallows it
  @Get('passcode/:passcode')
  async byPasscode(
    @CurrentFamilyHouse() house: FamilyHouse,
    @Param('passcode') passcode: string,
  ) {
    const data = await this.bookings.getByPasscode(scopeOfHouse(house), passcode);
    return { success: true, message: 'Booking fetched successfully', data };
  }

  @Get(':id')
  async get(
    @CurrentFamilyHouse() house: FamilyHouse,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const data = await this.bookings.get(scopeOfHouse(house), id);
    return { success: true, message: 'Booking fetched successfully', data };
  }

  @Post(':id/confirm')
  @HttpCode(HttpStatus.OK)
  async confirm(
    @CurrentUser() user: JwtUser,
    @CurrentFamilyHouse() house: FamilyHouse,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const data = await this.bookings.confirm(scopeOfHouse(house), id, user.id);
    return { success: true, message: 'Booking confirmed', data };
  }

  @Post(':id/reject')
  @HttpCode(HttpStatus.OK)
  async reject(
    @CurrentUser() user: JwtUser,
    @CurrentFamilyHouse() house: FamilyHouse,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RejectBookingDto,
  ) {
    const data = await this.bookings.reject(
      scopeOfHouse(house),
      id,
      user.id,
      dto.reason,
    );
    return { success: true, message: 'Booking rejected', data };
  }

  @Post(':id/check-in')
  @HttpCode(HttpStatus.OK)
  async checkIn(
    @CurrentUser() user: JwtUser,
    @CurrentFamilyHouse() house: FamilyHouse,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const data = await this.bookings.checkIn(scopeOfHouse(house), id, user.id);
    return { success: true, message: 'Corper checked in', data };
  }

  @Post(':id/documents/verify')
  @HttpCode(HttpStatus.OK)
  async verifyDocuments(
    @CurrentUser() user: JwtUser,
    @CurrentFamilyHouse() house: FamilyHouse,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const data = await this.desk.verifyDocuments(scopeOfHouse(house), id, user.id);
    return { success: true, message: 'Documents verified', data };
  }

  // places or moves a corper ("Assign" / "Reallocate Bed")
  @Post(':id/assign-bed')
  @HttpCode(HttpStatus.OK)
  async assignBed(
    @CurrentFamilyHouse() house: FamilyHouse,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AssignBedDto,
  ) {
    const data = await this.inventory.assignBed(scopeOfHouse(house), id, dto.bedSlotId);
    return { success: true, message: 'Bed assigned', data };
  }

  // "Board Bus" / "Mark Arrived"
  @Post(':id/transit')
  @HttpCode(HttpStatus.OK)
  async setTransit(
    @CurrentFamilyHouse() house: FamilyHouse,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: TransitActionDto,
  ) {
    const data = await this.transit.setTransit(scopeOfHouse(house), id, dto.status);
    return { success: true, message: 'Transit status updated', data };
  }
}
