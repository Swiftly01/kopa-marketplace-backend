import {
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateReviewDto {
  // the id of a product OR of an ad (ids are UUIDs, so the id alone says which)
  @IsUUID()
  productId!: string;

  @IsUUID()
  sellerId!: string;

  @IsOptional()
  @IsUUID()
  interactionId?: string;

  @IsInt()
  @Min(1)
  @Max(5)
  rating!: number;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  comment?: string;
}
