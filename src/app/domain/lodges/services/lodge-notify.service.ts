import { Injectable } from '@nestjs/common';
import { AppLogger } from '../../../logger/logger.service';
import { NotificationType } from '../../../notification/enums/notification-type.enum';
import { NotificationService } from '../../../notification/services/notification.service';

// one-to-one lodge notifications; a failed send is logged and never fails the action
@Injectable()
export class LodgeNotifyService {
  constructor(
    private readonly notifications: NotificationService,
    private readonly logger: AppLogger,
  ) {}

  async send(
    userId: string | null,
    message: { title: string; body: string; data: Record<string, unknown> },
  ): Promise<void> {
    if (!userId) return;
    try {
      await this.notifications.send({
        userId,
        type: NotificationType.GENERIC,
        ...message,
      });
    } catch (error) {
      this.logger.warn(
        `Could not send lodge notification to ${userId}: ${String(error)}`,
        LodgeNotifyService.name,
      );
    }
  }
}
