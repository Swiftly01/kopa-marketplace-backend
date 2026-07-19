import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  Matches,
} from 'class-validator';
import { NotificationChannel } from '../enums/notification-channel.enum';

const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

export class UpdatePreferenceDto {
  @IsEnum(NotificationChannel)
  channel!: NotificationChannel;

  @IsBoolean()
  enabled!: boolean;

  @IsOptional()
  @Matches(TIME_PATTERN, { message: 'quietHoursStart must be in HH:mm format' })
  quietHoursStart?: string;

  @IsOptional()
  @Matches(TIME_PATTERN, { message: 'quietHoursEnd must be in HH:mm format' })
  quietHoursEnd?: string;

  @IsOptional()
  @IsString()
  timezone?: string;
}
