import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { UserRole } from '../../common/enums/roles-enum';
import { NotificationService } from '../services/notification.service';
import { DeadLetterService } from '../services/dead-letter.service';
import {
  BulkSendNotificationDto,
  SendNotificationDto,
} from '../dtos/send-notification.dto';
import { TestNotificationDto } from '../dtos/test-notification.dto';
import { TestNotificationService } from '../services/test-notification.service';
import {
  BroadcastAudience,
  BroadcastNotificationDto,
} from '../dtos/broadcast-notification.dto';
import { NotificationBroadcastService } from '../services/notification-broadcast.service';

@Controller('admin/notifications')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class NotificationAdminController {
  constructor(
    private readonly notificationService: NotificationService,
    private readonly deadLetterService: DeadLetterService,
    private readonly testNotificationService: TestNotificationService,
    private readonly broadcastService: NotificationBroadcastService,
  ) {}

  @Post('send')
  send(@Body() dto: SendNotificationDto) {
    return this.notificationService.send(dto);
  }

  @Post('bulk')
  sendBulk(@Body() dto: BulkSendNotificationDto) {
    return this.notificationService.sendBulk(dto.notifications);
  }

  @Post('broadcast')
  broadcast(@Body() dto: BroadcastNotificationDto) {
    return this.broadcastService.broadcast(dto);
  }

  @Get('broadcast/estimate')
  estimateBroadcastAudience(
    @Query('audience') audience: BroadcastAudience,
    @Query('userIds') userIds?: string,
    @Query('roleFilter') roleFilter?: string,
  ) {
    return this.broadcastService.estimateAudience({
      audience,
      userIds: userIds ? userIds.split(',').filter(Boolean) : undefined,
      roleFilter,
    });
  }

  @Get('dead-letter')
  listDeadLetter() {
    return this.deadLetterService.list();
  }

  @Post('dead-letter/:id/retry')
  retryDeadLetter(@Param('id') id: string) {
    return this.deadLetterService.retry(id);
  }

  @Post('test')
  test(@Body() dto: TestNotificationDto) {
    return this.testNotificationService.runTest(dto);
  }
}
