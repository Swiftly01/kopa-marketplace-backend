import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { Trim } from '../../utils/trim.decorator';
import { BRAND_MAX_LENGTH, MAX_QUANTITY } from './product-sale.constants';
import { ProductCondition } from './product-sale.enums';

// the `details` payload of a generic "item for sale" listing
export class ProductSaleDetailsDto {
  @IsEnum(ProductCondition)
  condition!: ProductCondition;

  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(BRAND_MAX_LENGTH)
  brand?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(MAX_QUANTITY)
  quantity?: number;
}
