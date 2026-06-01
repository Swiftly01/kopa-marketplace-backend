import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { PaginationQueryDto } from '../../../common/pagination/dtos/pagination-query.dto';
import { SortOrder } from '../../admin/dtos/filter-users-dto';
import { SortBy } from '../../products/dtos/search-product-filter-dto';

export class GetSavedProductsQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @IsOptional()
  @IsEnum(SortBy)
  sortBy?: SortBy;

  @IsOptional()
  @IsEnum(SortOrder)
  sortOrder?: SortOrder;
}
