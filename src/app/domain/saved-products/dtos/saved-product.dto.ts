import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class SavedProductDto {
  @IsUUID()
  productId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
