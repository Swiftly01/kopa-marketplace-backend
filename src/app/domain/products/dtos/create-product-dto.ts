import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Matches,
  Max,
  Min,
} from 'class-validator';
import { ProductCondition } from '../enums/product-condition.enum';

export class CreateProductDto {
  @IsString()
  @Length(3, 200)
  name!: string;

  @IsString()
  @IsOptional()
  @Length(0, 2000)
  description?: string;

  @IsUUID()
  categoryId!: string;

  @IsString()
  @IsNotEmpty()
  @Length(2, 100)
  stateName!: string;

  @IsString()
  @IsNotEmpty()
  @Length(2, 10)
  @Matches(/^[A-Z]+$/, {
    message: 'stateCode must contain only uppercase letters',
  })
  stateCode!: string;

  @IsString()
  @IsNotEmpty()
  @Length(2, 100)
  lgaName!: string;

  @IsNumber()
  @Min(1)
  price!: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(100)
  discountPercentage?: number;

  @IsNumber()
  @Min(0)
  stock!: number;

  @IsEnum(ProductCondition)
  @IsOptional()
  condition?: ProductCondition;

  @IsString()
  @IsOptional()
  @Length(1, 100)
  sku?: string;

  @IsOptional()
  attributes?: Record<string, any>;
}
