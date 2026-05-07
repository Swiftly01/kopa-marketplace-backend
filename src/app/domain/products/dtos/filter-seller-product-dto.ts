import { IsEnum, IsOptional } from 'class-validator';
import { PaginationQueryDto } from '../../../common/pagination/dtos/pagination-query.dto';
import { ProductStatus } from '../enums/product-status.enum';

export class FilterSellerProductDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(ProductStatus)
  status?: ProductStatus;
}
