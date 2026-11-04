import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Trim } from '../../listings/utils/trim.decorator';
import { BedSlotStatus, BedWing, BunkType } from '../enums/lodge.enums';
import { MAX_LODGE_BED_SLOTS } from '../constants/lodge.constants';
import { PhoneNumber } from '../utils/phone.decorator';

export class CreateBedSlotDto {
  @IsOptional()
  @IsUUID()
  roomId?: string;

  @IsEnum(BedWing)
  wing!: BedWing;

  @IsEnum(BunkType)
  bunkType!: BunkType;

  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(100)
  locationNote?: string;
}

// "Auto-Calculate": appends numbered slots, alternating lower and upper bunks
export class GenerateBedSlotsDto {
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(MAX_LODGE_BED_SLOTS)
  maleCount!: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(MAX_LODGE_BED_SLOTS)
  femaleCount!: number;
}

export class UpdateBedSlotDto {
  // null takes the bed out of its room
  @IsOptional()
  @IsUUID()
  roomId?: string | null;

  @IsOptional()
  @IsEnum(BunkType)
  bunkType?: BunkType;

  // null clears the note
  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(100)
  locationNote?: string | null;

  // available, occupied or held by hand; the booking flow owns in_transit
  @IsOptional()
  @IsEnum(BedSlotStatus)
  status?: BedSlotStatus;

  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(60)
  occupantLabel?: string | null;
}

export class TransitInfoDto {
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 1 })
  @Min(0)
  @Max(1000)
  distanceKm?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(600)
  etaMinutes?: number;

  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(60)
  trafficStatus?: string;

  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(60)
  checkpointStatus?: string;

  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(60)
  fuelStatus?: string;

  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(1024)
  @Matches(/^https?:\/\/\S+$/i, {
    message: 'trackingUrl must be an http(s) link',
  })
  trackingUrl?: string;
}

export class UpdatePickupDto {
  @IsOptional()
  @IsBoolean()
  pickupEnabled?: boolean;

  @IsOptional()
  @IsDateString({ strict: true })
  pickupDate?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => TransitInfoDto)
  transitInfo?: TransitInfoDto;

  @IsOptional()
  @Trim()
  @IsString()
  @Length(2, 100)
  logisticsLeadName?: string;

  @IsOptional()
  @PhoneNumber()
  logisticsLeadPhone?: string;
}

const TIME_24H = /^([01]\d|2[0-3]):[0-5]\d$/;

export class CreatePickupBatchDto {
  @Trim()
  @IsString()
  @Length(2, 40)
  label!: string;

  @Matches(TIME_24H, { message: 'startTime must be HH:mm (24h)' })
  startTime!: string;

  @Matches(TIME_24H, { message: 'endTime must be HH:mm (24h)' })
  endTime!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  capacity!: number;

  @IsOptional()
  @IsUUID()
  gateId?: string;

  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(100)
  vehicleName?: string;

  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(100)
  driverName?: string;

  @IsOptional()
  @PhoneNumber()
  driverPhone?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(600)
  tripMinutes?: number;

  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(200)
  vehicleNote?: string;
}

export class UpdatePickupBatchDto {
  @IsOptional()
  @IsUUID()
  gateId?: string | null;

  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(100)
  vehicleName?: string;

  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(100)
  driverName?: string;

  @IsOptional()
  @PhoneNumber()
  driverPhone?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(600)
  tripMinutes?: number;

  @IsOptional()
  @Trim()
  @IsString()
  @Length(2, 40)
  label?: string;

  @IsOptional()
  @Matches(TIME_24H, { message: 'startTime must be HH:mm (24h)' })
  startTime?: string;

  @IsOptional()
  @Matches(TIME_24H, { message: 'endTime must be HH:mm (24h)' })
  endTime?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  capacity?: number;

  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(200)
  vehicleNote?: string | null;
}

export class UpdateLodgeImageDto {
  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(60)
  label?: string | null;

  // true makes this the cover photo; the previous cover is unset
  @IsOptional()
  @IsBoolean()
  isCover?: boolean;
}
