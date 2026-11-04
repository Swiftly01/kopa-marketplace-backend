import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsLatitude,
  IsLongitude,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { MAX_PRICE } from '../../listings/constants/listing.constants';
import { Trim } from '../../listings/utils/trim.decorator';
import {
  HouseRuleLevel,
  InventoryMode,
  LodgeAvailability,
} from '../enums/lodge.enums';
import { PhoneNumber } from '../utils/phone.decorator';

// http(s) link or an Open Location (plus) code; blocks javascript: and data: links
export const MAPS_REF_PATTERN =
  /^(https?:\/\/\S+|[23456789CFGHJMPQRVWX]{4,8}\+[23456789CFGHJMPQRVWX]{2,3}.*)$/i;

export class HouseRuleDto {
  @Trim()
  @IsString()
  @Length(2, 80)
  title!: string;

  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(200)
  description?: string;

  @IsBoolean()
  enabled!: boolean;

  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(80)
  value?: string;

  @IsEnum(HouseRuleLevel)
  level!: HouseRuleLevel;
}

// fields shared by create and update (all optional here; create adds the required ones)
export class LodgeDetailsDto {
  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(100)
  fellowship?: string;

  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(200)
  landmark?: string;

  // stateCode and lgaName come together; the service resolves canonical names
  @IsOptional()
  @Trim()
  @IsString()
  @Length(2, 10)
  stateCode?: string;

  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(100)
  lgaName?: string;

  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(1024)
  @Matches(MAPS_REF_PATTERN, {
    message: 'mapsUrl must be an http(s) link or a plus code',
  })
  mapsUrl?: string;

  @IsOptional()
  @IsLatitude()
  latitude?: number;

  @IsOptional()
  @IsLongitude()
  longitude?: number;

  @IsOptional()
  @Trim()
  @IsString()
  @Length(2, 100)
  coordinatorName?: string;

  @IsOptional()
  @PhoneNumber()
  hotline?: string;

  @IsOptional()
  @PhoneNumber()
  whatsappNumber?: string;

  @IsOptional()
  @IsEnum(InventoryMode)
  inventoryMode?: InventoryMode;

  // false when the lodge does not assign individual beds
  @IsOptional()
  @IsBoolean()
  bedSlotsEnabled?: boolean;

  // overall cap for lodges without bed slots; null removes the cap
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1000)
  capacity?: number | null;

  // whole Naira per bed; omit for free
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(MAX_PRICE)
  pricePerBed?: number;

  // preset codes or custom labels; replaces the stored list
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(30)
  @Trim()
  @IsString({ each: true })
  @Length(2, 80, { each: true })
  amenities?: string[];

  // replaces the stored list
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => HouseRuleDto)
  houseRules?: HouseRuleDto[];
}

export class CreateLodgeDto extends LodgeDetailsDto {
  @Trim()
  @IsString()
  @IsNotEmpty()
  @Length(5, 150)
  name!: string;

  @Trim()
  @IsString()
  @IsNotEmpty()
  @Length(10, 500)
  address!: string;
}

export class UpdateLodgeDto extends LodgeDetailsDto {
  @IsOptional()
  @Trim()
  @IsString()
  @Length(5, 150)
  name?: string;

  @IsOptional()
  @Trim()
  @IsString()
  @Length(10, 500)
  address?: string;
}

export class UpdateAvailabilityDto {
  @IsEnum(LodgeAvailability)
  availability!: LodgeAvailability;
}
