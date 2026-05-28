import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Put,
  Patch,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AdminUserService } from '../services/admin-user.service';
import { FilterUsersDto } from '../dtos/filter-users-dto';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../../auth/decorators/current-user.decorator';
import type { JwtUser } from '../../../common/types/request-with-user.interface';
import type { Request } from 'express';
import { ChangeUserRoleDto } from '../dtos/change-user-role.dto';
import { SuspendUserDto } from '../dtos/suspend-user.dto';
import { DeleteUserDto } from '../dtos/delete-user.dto';

@Controller('admin/users')
@UseGuards(JwtAuthGuard)
export class AdminUserController {
  constructor(private readonly adminUserService: AdminUserService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  async getAllUsers(@Query() query: FilterUsersDto, @Req() req: Request) {
    const baseUrl = `${req.protocol}://${req.get('host')}${req.originalUrl}`;
    return await this.adminUserService.getAllUsers(query, baseUrl);
  }

  @Get('stats')
  @HttpCode(HttpStatus.OK)
  async getUserStatistics() {
    const stats = await this.adminUserService.getUserStatistics();

    return {
      success: true,
      message: 'User statistics fetched',
      data: stats,
    };
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async getUser(@Param('id') userId: string) {
    const user = await this.adminUserService.getUser(userId);

    return {
      success: true,
      message: 'User fetched successfully',
      data: {
        user,
      },
    };
  }

  @Patch(':id/role')
  @HttpCode(HttpStatus.OK)
  async changeUserRole(
    @Param('id') userId: string,
    @Body() changeRoleDto: ChangeUserRoleDto,
    @CurrentUser() adminUser: JwtUser,
  ) {
    const user = await this.adminUserService.changeUserRole(
      userId,
      changeRoleDto.newRole,
      adminUser.id,
    );

    return {
      success: true,
      message: `User role change to ${changeRoleDto.newRole}`,
      data: { user },
    };
  }

  @Put(':id/suspend')
  @HttpCode(HttpStatus.OK)
  async suspendUser(
    @Param('id') userId: string,
    @Body() suspendDto: SuspendUserDto,
    @CurrentUser() adminUser: JwtUser,
  ) {
    const user = await this.adminUserService.suspendUser(
      userId,
      adminUser.id,
      suspendDto.reason,
    );

    return {
      success: true,
      message: 'User suspended successfully',
      data: { user },
    };
  }

  @Put(':id/unsuspend')
  @HttpCode(HttpStatus.OK)
  async unsuspendUser(
    @Param('id') userId: string,
    @CurrentUser() adminUser: JwtUser,
  ) {
    const user = await this.adminUserService.unsuspendUser(
      userId,
      adminUser.id,
    );

    return {
      success: true,
      message: 'User unsuspended successfully',
      data: { user },
    };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async deleteUser(
    @Param('id') userId: string,
    @Body() deleteDto: DeleteUserDto,
    @CurrentUser() adminUser: JwtUser,
  ) {
    const result = await this.adminUserService.deleteUser(
      userId,
      deleteDto.reason,
      adminUser.id,
    );

    return {
      success: true,
      message: 'User deleted successfully',
      data: result,
    };
  }
}
