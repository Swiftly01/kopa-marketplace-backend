import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';
import { PaginationQueryDto } from '../../../common/pagination/dtos/pagination-query.dto';
import {
  BedWing,
  BookingStatus,
  CorperGender,
  TransitStatus,
  LodgeAvailability,
  LodgeStatus,
} from '../enums/lodge.enums';

const toBool = ({ obj, key }: { obj: Record<string, unknown>; key: string }) => {
  const raw = obj[key];
  return raw === 'true' || raw === true
    ? true
    : raw === 'false' || raw === false
      ? false
      : raw;
};

// "a,b" or repeated params -> string[]
const toList = ({ value }: { value: unknown }) =>
  typeof value === 'string'
    ? value
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean)
    : value;

// house admin and super admin list; `search` (name, address) comes from PaginationQueryDto
export class LodgeManageQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(LodgeStatus)
  status?: LodgeStatus;

  @IsOptional()
  @IsEnum(LodgeAvailability)
  availability?: LodgeAvailability;
}

export class AdminLodgeQueryDto extends LodgeManageQueryDto {
  @IsOptional()
  @IsUUID()
  familyHouseId?: string;
}

// corper browse: only published, open lodges that still have a free bed
export class CorperLodgeQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  stateCode?: string;

  @IsOptional()
  @IsString()
  lgaName?: string;

  @IsOptional()
  @IsString()
  fellowship?: string;

  // only lodges with a free bed in the matching wing
  @IsOptional()
  @IsEnum(CorperGender)
  gender?: CorperGender;

  // amenity codes; the lodge must offer all of them
  @IsOptional()
  @Transform(toList)
  @IsArray()
  @IsString({ each: true })
  amenities?: string[];

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  maxPrice?: number;

  @IsOptional()
  @Transform(toBool)
  @IsBoolean()
  hasPickup?: boolean;
}

export class BedSlotQueryDto {
  // limits the grid to the wing this gender is assigned to
  @IsOptional()
  @IsEnum(CorperGender)
  gender?: CorperGender;
}

export class BookingManageQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsUUID()
  lodgeId?: string;

  @IsOptional()
  @IsEnum(BookingStatus)
  status?: BookingStatus;

  // "Wings & Quarters" filter; `unassigned` means no bed yet
  @IsOptional()
  @IsIn([...Object.values(BedWing), 'unassigned'])
  wing?: BedWing | 'unassigned';

  @IsOptional()
  @IsUUID()
  roomId?: string;

  @IsOptional()
  @IsUUID()
  pickupBatchId?: string;

  @IsOptional()
  @IsUUID()
  gateId?: string;

  @IsOptional()
  @IsEnum(TransitStatus)
  transitStatus?: TransitStatus;

  // only corpers who opted for the camp bus
  @IsOptional()
  @Transform(toBool)
  @IsBoolean()
  hasPickup?: boolean;
}

// lodge the desk, inventory or transit dashboard is about
export class LodgeIdQueryDto {
  @IsUUID()
  lodgeId!: string;
}

export class MyBookingsQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(BookingStatus)
  status?: BookingStatus;
}
