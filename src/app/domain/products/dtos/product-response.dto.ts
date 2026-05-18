import { ProductImageDto } from './product-image.dto';
import { SellerPublicDto } from './seller-public.dto';

export class ProductResponseDto {
  id!: string;
  name!: string;
  slug!: string;
  description!: string;
  price!: number;
  stock!: number;
  seller!: SellerPublicDto;
  images!: ProductImageDto[];
}
