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
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { CurrentFamilyHouse } from '../decorators/current-family-house.decorator';
import { CreateRoomDto, UpdateRoomDto } from '../dtos/lodge-inventory.dto';
import {
  AlertMessageDto,
  BatchStatusDto,
  CreateGateDto,
  UpdateGateDto,
} from '../dtos/lodge-logistics.dto';
import { FamilyHouse } from '../entities/family-house.entity';
import { FamilyHouseAdminGuard } from '../guards/family-house-admin.guard';
import { LodgeInventoryService } from '../services/lodge-inventory.service';
import { LodgePickupService } from '../services/lodge-pickup.service';
import { LodgeRoomService } from '../services/lodge-room.service';
import { LodgeTransitService } from '../services/lodge-transit.service';
import { scopeOfHouse } from '../utils/lodge-scope';

// room inventory board and pickup logistics board of the house admin's own lodges
@UseGuards(JwtAuthGuard, FamilyHouseAdminGuard)
@Controller('family-house/lodges/:id')
export class FamilyHouseOpsController {
  constructor(
    private readonly rooms: LodgeRoomService,
    private readonly inventory: LodgeInventoryService,
    private readonly pickup: LodgePickupService,
    private readonly transit: LodgeTransitService,
  ) {}

  // ---- Bed Slot & Room Inventory ----

  @Get('inventory')
  async board(
    @CurrentFamilyHouse() house: FamilyHouse,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const data = await this.inventory.get(scopeOfHouse(house), id);
    return { success: true, message: 'Inventory fetched successfully', data };
  }

  @Post('inventory/auto-assign')
  @HttpCode(HttpStatus.OK)
  async autoAssign(
    @CurrentFamilyHouse() house: FamilyHouse,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const data = await this.inventory.autoAssign(scopeOfHouse(house), id);
    return { success: true, message: 'Corpers distributed by wing', data };
  }

  @Get('rooms')
  async listRooms(
    @CurrentFamilyHouse() house: FamilyHouse,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const data = await this.rooms.list(scopeOfHouse(house), id);
    return { success: true, message: 'Rooms fetched successfully', data };
  }

  @Post('rooms')
  async createRoom(
    @CurrentFamilyHouse() house: FamilyHouse,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateRoomDto,
  ) {
    const data = await this.rooms.create(scopeOfHouse(house), id, dto);
    return { success: true, message: 'Room added', data };
  }

  @Patch('rooms/:roomId')
  async updateRoom(
    @CurrentFamilyHouse() house: FamilyHouse,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('roomId', ParseUUIDPipe) roomId: string,
    @Body() dto: UpdateRoomDto,
  ) {
    const data = await this.rooms.update(scopeOfHouse(house), id, roomId, dto);
    return { success: true, message: 'Room updated', data };
  }

  @Delete('rooms/:roomId')
  async removeRoom(
    @CurrentFamilyHouse() house: FamilyHouse,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('roomId', ParseUUIDPipe) roomId: string,
  ) {
    const data = await this.rooms.remove(scopeOfHouse(house), id, roomId);
    return { success: true, message: 'Room removed', data };
  }

  // ---- Pickup Logistics ----

  @Get('transit')
  async dashboard(
    @CurrentFamilyHouse() house: FamilyHouse,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const data = await this.transit.dashboard(scopeOfHouse(house), id);
    return {
      success: true,
      message: 'Transit dashboard fetched successfully',
      data,
    };
  }

  @Get('pickup/gates')
  async listGates(
    @CurrentFamilyHouse() house: FamilyHouse,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const data = await this.pickup.listGates(scopeOfHouse(house), id);
    return {
      success: true,
      message: 'Assembly gates fetched successfully',
      data,
    };
  }

  @Post('pickup/gates')
  async createGate(
    @CurrentFamilyHouse() house: FamilyHouse,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateGateDto,
  ) {
    const data = await this.pickup.createGate(scopeOfHouse(house), id, dto);
    return { success: true, message: 'Assembly gate added', data };
  }

  @Patch('pickup/gates/:gateId')
  async updateGate(
    @CurrentFamilyHouse() house: FamilyHouse,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('gateId', ParseUUIDPipe) gateId: string,
    @Body() dto: UpdateGateDto,
  ) {
    const data = await this.pickup.updateGate(
      scopeOfHouse(house),
      id,
      gateId,
      dto,
    );
    return { success: true, message: 'Assembly gate updated', data };
  }

  @Delete('pickup/gates/:gateId')
  async removeGate(
    @CurrentFamilyHouse() house: FamilyHouse,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('gateId', ParseUUIDPipe) gateId: string,
  ) {
    const data = await this.pickup.removeGate(scopeOfHouse(house), id, gateId);
    return { success: true, message: 'Assembly gate removed', data };
  }

  // start boarding, depart, arrive or cancel a trip
  @Post('pickup/batches/:batchId/status')
  @HttpCode(HttpStatus.OK)
  async batchStatus(
    @CurrentFamilyHouse() house: FamilyHouse,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('batchId', ParseUUIDPipe) batchId: string,
    @Body() dto: BatchStatusDto,
  ) {
    const data = await this.pickup.setBatchStatus(
      scopeOfHouse(house),
      id,
      batchId,
      dto.status,
    );
    return { success: true, message: 'Trip updated', data };
  }

  @Post('pickup/batches/:batchId/alert')
  @HttpCode(HttpStatus.OK)
  async alertRiders(
    @CurrentFamilyHouse() house: FamilyHouse,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('batchId', ParseUUIDPipe) batchId: string,
    @Body() dto: AlertMessageDto,
  ) {
    const data = await this.transit.alertBatch(
      scopeOfHouse(house),
      id,
      batchId,
      dto.message,
    );
    return { success: true, message: 'Riders alerted', data };
  }
}
