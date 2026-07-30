import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { NotificationType } from '../enums/notification-type.enum';
import { NotificationChannel } from '../enums/notification-channel.enum';
import { NotificationPriority } from '../enums/notification-priority.enum';
import { sanitizeEmailHtml } from '../utils/sanitize-email.html';
import { MAX_BATCH_RECIPIENTS } from '../constant';

export class SendNotificationBatchDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(MAX_BATCH_RECIPIENTS, {
    message: `Only ${MAX_BATCH_RECIPIENTS} users can be sent to at a time`,
  })
  @IsUUID('4', { each: true })
  userIds!: string[];

  @IsEnum(NotificationType)
  type!: NotificationType;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  title?: string;

  @IsString()
  body!: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }: { value: unknown }) => {
    if (typeof value !== 'string') {
      return value;
    }
    return sanitizeEmailHtml(value);
  })
  html?: string;

  @IsOptional()
  @IsObject()
  data?: Record<string, unknown>;

  @IsOptional()
  @IsArray()
  @IsEnum(NotificationChannel, { each: true })
  channels?: NotificationChannel[];

  @IsOptional()
  @IsEnum(NotificationPriority)
  priority?: NotificationPriority;

  @IsOptional()
  @IsDateString()
  scheduledFor?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  batchKey?: string;
}
