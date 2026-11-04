import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { Trim } from '../../listings/utils/trim.decorator';
import { BedWing, RoomKind } from '../enums/lodge.enums';

export class CreateRoomDto {
  @Trim()
  @IsString()
  @Length(2, 100)
  name!: string;

  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(200)
  description?: string;

  @IsOptional()
  @IsEnum(RoomKind)
  kind?: RoomKind;

  // omit for private or mixed rooms
  @IsOptional()
  @IsEnum(BedWing)
  wing?: BedWing;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(12)
  @Trim()
  @IsString({ each: true })
  @Length(2, 40, { each: true })
  features?: string[];

  // whole Naira per month
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100_000_000)
  rentContribution?: number;
}

export class UpdateRoomDto {
  @IsOptional()
  @Trim()
  @IsString()
  @Length(2, 100)
  name?: string;

  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(200)
  description?: string | null;

  @IsOptional()
  @IsEnum(RoomKind)
  kind?: RoomKind;

  @IsOptional()
  @IsEnum(BedWing)
  wing?: BedWing | null;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(12)
  @Trim()
  @IsString({ each: true })
  @Length(2, 40, { each: true })
  features?: string[];

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100_000_000)
  rentContribution?: number | null;
}
