import { NotificationChannel } from '../enums/notification-channel.enum';
import { NotificationPriority } from '../enums/notification-priority.enum';
import { NotificationType } from '../enums/notification-type.enum';

export interface DispatchJobData {
  notificationRequestId: string;
  userId: string;
  type: NotificationType;
  title?: string;
  body: string;
  html?: string;
  data?: Record<string, unknown>;
  priority: NotificationPriority;
  channels?: NotificationChannel[];
  idempotencyKey: string;
}

export interface ChannelJobData {
  notificationId: string;
  userId: string;
  channel: NotificationChannel;
  type: NotificationType;
  to?: string;
  tokens?: string[];
  title?: string;
  body: string;
  html?: string;
  data?: Record<string, unknown>;
}
