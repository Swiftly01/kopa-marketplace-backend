import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { UserRole } from '../../common/enums/roles-enum';
import { JwtUser } from '../../common/types/request-with-user.interface';
import {
  BroadcastAudience,
  BroadcastNotificationDto,
} from '../dtos/broadcast-notification.dto';
import { SearchRecipientsDto } from '../dtos/search-recipients.dto';
import { SendNotificationBatchDto } from '../dtos/send-notification-batch.dto';
import {
  BulkSendNotificationDto,
  SendNotificationDto,
} from '../dtos/send-notification.dto';
import { TestNotificationDto } from '../dtos/test-notification.dto';
import { BatchFeature } from '../enums/batch-feature.enum';
import { DeadLetterService } from '../services/dead-letter.service';
import { NotificationBroadcastService } from '../services/notification-broadcast.service';
import { NotificationService } from '../services/notification.service';
import { TestNotificationService } from '../services/test-notification.service';

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

  @Post('send/batch')
  sendBatch(
    @Body() dto: SendNotificationBatchDto,
    @CurrentUser() admin: JwtUser,
  ) {
    return this.notificationService.sendToBatch(dto, admin.id);
  }

  @Post('broadcast')
  broadcast(
    @Body() dto: BroadcastNotificationDto,
    @CurrentUser() admin: JwtUser,
  ) {
    return this.broadcastService.broadcast(dto, admin.id);
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

  @Get('recipients')
  searchRecipients(
    @Query() query: SearchRecipientsDto,
    @CurrentUser() admin: JwtUser,
    @Req() req: Request,
  ) {
    this.assertValidFeature(query.feature);
    const baseUrl = `${req.protocol}://${req.get('host')}${req.originalUrl}`;
    return this.notificationService.searchRecipients(
      query.feature,
      admin.id,
      query,
      baseUrl,
    );
  }

  @Get('batches')
  getActiveBatches(
    @Query('feature') feature: BatchFeature,
    @CurrentUser() admin: JwtUser,
  ) {
    this.assertValidFeature(feature);
    return this.notificationService.getActiveBatches(feature, admin.id);
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

  private assertValidFeature(
    feature: BatchFeature,
  ): asserts feature is BatchFeature {
    if (!Object.values(BatchFeature).includes(feature)) {
      throw new BadRequestException(
        `feature must be one of: ${Object.values(BatchFeature).join(', ')}`,
      );
    }
  }
}
