import {
  Body,
  Controller,
  Get,
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
import { Roles } from '../../../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../auth/guards/roles.guard';
import { UserRole } from '../../../common/enums/roles-enum';
import type { JwtUser } from '../../../common/types/request-with-user.interface';
import {
  ApplicationQueryDto,
  CreateFamilyHouseApplicationDto,
  RejectApplicationDto,
} from '../dtos/family-house-application.dto';
import { FamilyHouseApplicationService } from '../services/family-house-application.service';
import { fullUrl } from '../utils/full-url';

// any signed-in user: apply to register a family house and follow the decision
@UseGuards(JwtAuthGuard)
@Controller('family-house-applications')
export class FamilyHouseApplicationController {
  constructor(private readonly applications: FamilyHouseApplicationService) {}

  @Post()
  async apply(
    @CurrentUser() user: JwtUser,
    @Body() dto: CreateFamilyHouseApplicationDto,
  ) {
    const data = await this.applications.apply(user.id, dto);
    return { success: true, message: 'Application submitted', data };
  }

  @Get('mine')
  async mine(@CurrentUser() user: JwtUser) {
    const data = await this.applications.listMine(user.id);
    return {
      success: true,
      message: 'Applications fetched successfully',
      data,
    };
  }
}

// super admin: the review queue on the main dashboard
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('admin/family-house-applications')
export class AdminFamilyHouseApplicationController {
  constructor(private readonly applications: FamilyHouseApplicationService) {}

  @Get()
  async list(@Query() query: ApplicationQueryDto, @Req() req: Request) {
    const data = await this.applications.list(query, fullUrl(req));
    return {
      success: true,
      message: 'Applications fetched successfully',
      data,
    };
  }

  // static path first so ':id' never swallows it
  @Get('stats')
  async stats() {
    const data = await this.applications.counts();
    return {
      success: true,
      message: 'Application counts fetched successfully',
      data,
    };
  }

  @Get(':id')
  async get(@Param('id', ParseUUIDPipe) id: string) {
    const data = await this.applications.get(id);
    return { success: true, message: 'Application fetched successfully', data };
  }

  @Post(':id/approve')
  @HttpCode(HttpStatus.OK)
  async approve(
    @CurrentUser() admin: JwtUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const data = await this.applications.approve(id, admin.id);
    return { success: true, message: 'Application approved', data };
  }

  @Post(':id/reject')
  @HttpCode(HttpStatus.OK)
  async reject(
    @CurrentUser() admin: JwtUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RejectApplicationDto,
  ) {
    const data = await this.applications.reject(id, admin.id, dto.reason);
    return { success: true, message: 'Application rejected', data };
  }
}
