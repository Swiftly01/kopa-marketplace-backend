import {
  ArrayMaxSize,
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  Length,
} from 'class-validator';
import { NotificationChannel } from '../../../notification/enums/notification-channel.enum';
import { Trim } from '../../listings/utils/trim.decorator';
import { BookingStatus } from '../enums/lodge.enums';

// SMS / email / push to a filtered group of corpers (WhatsApp goes through per-corper links)
export class BroadcastDto {
  @IsUUID()
  lodgeId!: string;

  @Trim()
  @IsString()
  @Length(3, 300)
  message!: string;

  @IsOptional()
  @IsEnum(BookingStatus)
  status?: BookingStatus;

  @IsOptional()
  @IsUUID()
  pickupBatchId?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(3)
  @IsEnum(NotificationChannel, { each: true })
  channels?: NotificationChannel[];
}
