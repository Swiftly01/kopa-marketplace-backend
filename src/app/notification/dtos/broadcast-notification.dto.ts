import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { UserRole } from '../../common/enums/roles-enum';
import { NotificationType } from '../enums/notification-type.enum';
import { Transform } from 'class-transformer';
import { sanitizeEmailHtml } from '../utils/sanitize-email.html';
import { NotificationChannel } from '../enums/notification-channel.enum';
import { NotificationPriority } from '../enums/notification-priority.enum';
import { MAX_BATCH_RECIPIENTS } from '../constant';

export enum BroadcastAudience {
  ALL = 'all',
  SPECIFIC = 'specific',
}

export class BroadcastNotificationDto {
  @IsEnum(BroadcastAudience)
  audience!: BroadcastAudience;

  // Validate only when audience === specific
  @ValidateIf(
    (o: BroadcastNotificationDto) => o.audience === BroadcastAudience.SPECIFIC,
  )
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(MAX_BATCH_RECIPIENTS, {
    message: `Only ${MAX_BATCH_RECIPIENTS} users can be sent to at a time`,
  })
  @IsUUID('4', { each: true })
  userIds?: string[];

  // Validate only when audience === specific and send base on role
  @ValidateIf(
    (o: BroadcastNotificationDto) => o.audience === BroadcastAudience.ALL,
  )
  @IsOptional()
  @IsEnum(UserRole)
  roleFilter?: UserRole;

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
  bodyHtml?: string;

  @IsOptional()
  @IsOptional()
  data?: Record<string, unknown>;

  @IsArray()
  @ArrayMinSize(1)
  @IsEnum(NotificationChannel, { each: true })
  channels!: NotificationChannel[];

  @IsOptional()
  @IsEnum(NotificationPriority)
  priority?: NotificationPriority;

  @IsOptional()
  @IsDateString()
  scheduledFor?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  broadcastKey?: string;
}
