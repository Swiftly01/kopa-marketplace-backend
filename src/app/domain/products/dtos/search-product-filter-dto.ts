import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { PaginationQueryDto } from '../../../common/pagination/dtos/pagination-query.dto';
import { LocationType } from '../../location/entities/location.entity';

export enum SortBy {
  NEWEST = 'newest',
  PRICE_DESC = 'price-asc',
  PEICE_DESC = 'price-desc',
  POPULAR = 'popular',
}

export class SearchProductFilterDto extends PaginationQueryDto {
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @IsOptional()
  @IsString()
  categorySlug?: string;

  @IsOptional()
  @IsString()
  locationId?: string;

  @IsOptional()
  @IsString()
  type?: LocationType;

  @IsOptional()
  @IsNumber()
  minPrice?: number;

  @IsOptional()
  @IsNumber()
  maxPrice?: number;

  @IsOptional()
  @IsString()
  condition?: string;

  @IsOptional()
  @IsEnum(SortBy)
  sortBy?: SortBy;
}
