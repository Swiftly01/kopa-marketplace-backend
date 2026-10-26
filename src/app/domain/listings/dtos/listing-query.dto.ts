import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';
import { PaginationQueryDto } from '../../../common/pagination/dtos/pagination-query.dto';
import { ListingStatus } from '../enums/listing-status.enum';

// public browse filters; `search` (title) comes from PaginationQueryDto
export class ListingQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  // alternative to categoryId, used by the homepage filter
  @IsOptional()
  @IsString()
  categorySlug?: string;

  // only this seller's ads (public seller profile page)
  @IsOptional()
  @IsUUID()
  sellerId?: string;

  @IsOptional()
  @IsString()
  stateCode?: string;

  // alternative to stateCode, used by the homepage filter
  @IsOptional()
  @IsString()
  stateName?: string;

  @IsOptional()
  @IsString()
  lgaName?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  minPrice?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  maxPrice?: number;
}

// the owner's own listings, optionally filtered by status
export class MyListingsQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(ListingStatus)
  status?: ListingStatus;
}
