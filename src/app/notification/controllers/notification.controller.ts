import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { JwtUser } from '../../common/types/request-with-user.interface';
import { NotificationQueryDto } from '../dtos/notification-query.dto';
import { RegisterDeviceTokenDto } from '../dtos/register-device-token.dto';
import { UpdatePreferenceDto } from '../dtos/update-preference.dto';
import { DeviceTokenService } from '../services/device-token.service';
import { NotificationPreferenceService } from '../services/notification-preference.service';
import { NotificationService } from '../services/notification.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationController {
  constructor(
    private readonly notificationService: NotificationService,
    private readonly preferenceService: NotificationPreferenceService,
    private readonly deviceTokenService: DeviceTokenService,
  ) {}

  @Get()
  findMyNotifications(
    @CurrentUser() user: JwtUser,
    @Query() query: NotificationQueryDto,
  ) {
    return this.notificationService.findForUser(user.id, query);
  }

  @Get('preferences')
  getPreferences(@CurrentUser() user: JwtUser) {
    return this.preferenceService.listForUser(user.id);
  }

  @Patch('preferences')
  updatePreference(
    @CurrentUser() user: JwtUser,
    @Body() dto: UpdatePreferenceDto,
  ) {
    return this.preferenceService.upsert(user.id, dto);
  }

  @Post('device-tokens')
  registerDeviceToken(
    @CurrentUser() user: JwtUser,
    @Body() dto: RegisterDeviceTokenDto,
  ) {
    return this.deviceTokenService.register(user.id, dto);
  }

  @Get('unread-count')
  getUnreadCount(@CurrentUser() user: JwtUser) {
    return this.notificationService.getUnreadCount(user.id);
  }

  @Get(':notificationId')
  findOne(
    @CurrentUser() user: JwtUser,
    @Param('notificationId') notificationId: string,
  ) {
    return this.notificationService.findOneForUser(user.id, notificationId);
  }

  @Delete('device-tokens/:token')
  removeDeviceToken(@Param('token') token: string) {
    return this.deviceTokenService.deactivate(token);
  }

  @Patch(':notificationId/read')
  markAsRead(
    @Param('notificationId') notificationId: string,
    @CurrentUser() user: JwtUser,
  ) {
    return this.notificationService.markAsRead(user.id, notificationId);
  }

  @Patch(':notificationId/unread')
  markAsUnread(
    @Param('notificationId') notificationId: string,
    @CurrentUser() user: JwtUser,
  ) {
    return this.notificationService.markAsUnread(user.id, notificationId);
  }

  @Patch('read-all')
  markAllAsRead(@CurrentUser() user: JwtUser) {
    return this.notificationService.markAllAsRead(user.id);
  }

  @Delete(':notificationId')
  remove(
    @CurrentUser() user: JwtUser,
    @Param('notificationId') notificationId: string,
  ) {
    return this.notificationService.remove(user.id, notificationId);
  }
}
