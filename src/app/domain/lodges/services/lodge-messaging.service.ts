import { Injectable } from '@nestjs/common';
import { AppLogger } from '../../../logger/logger.service';
import { NotificationChannel } from '../../../notification/enums/notification-channel.enum';
import { NotificationType } from '../../../notification/enums/notification-type.enum';
import { NotificationService } from '../../../notification/services/notification.service';

const CHUNK = 100;

// bulk messages to corpers; delivery problems are logged, never thrown at the exco
@Injectable()
export class LodgeMessagingService {
  constructor(
    private readonly notifications: NotificationService,
    private readonly logger: AppLogger,
  ) {}

  // returns how many corpers the message was handed to
  async toCorpers(
    userIds: string[],
    message: {
      title: string;
      body: string;
      data: Record<string, unknown>;
      channels?: NotificationChannel[];
    },
  ): Promise<number> {
    const unique = [...new Set(userIds)];
    let sent = 0;
    for (let i = 0; i < unique.length; i += CHUNK) {
      const chunk = unique.slice(i, i + CHUNK);
      try {
        await this.notifications.sendBulk(
          chunk.map((userId) => ({
            userId,
            type: NotificationType.GENERIC,
            title: message.title,
            body: message.body,
            data: message.data,
            ...(message.channels ? { channels: message.channels } : {}),
          })),
        );
        sent += chunk.length;
      } catch (error) {
        this.logger.warn(
          `Lodge broadcast chunk failed: ${String(error)}`,
          LodgeMessagingService.name,
        );
      }
    }
    return sent;
  }
}
