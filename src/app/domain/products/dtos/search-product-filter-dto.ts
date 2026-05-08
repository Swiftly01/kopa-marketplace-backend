import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { PaginationQueryDto } from '../../../common/pagination/dtos/pagination-query.dto';

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
  location?: string;

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
