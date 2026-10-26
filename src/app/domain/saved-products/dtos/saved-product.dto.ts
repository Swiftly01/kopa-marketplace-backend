import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class SavedProductDto {
  // the id of a product OR of an ad (ids are UUIDs, so the id alone says which)
  @IsUUID()
  productId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
