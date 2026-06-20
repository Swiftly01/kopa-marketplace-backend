import {
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import { PromotionAssetType } from '../entities/promotion.entity';

export class PromotionStatusDto {
  @IsString()
  promotionId!: string;

  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  description?: string | null;

  @IsEnum(PromotionAssetType)
  assetType!: PromotionAssetType;

  @IsOptional()
  @IsString()
  slotLimit?: number | null;

  @IsNumber()
  claimedCount!: number;

  @IsOptional()
  @IsNumber()
  slotsRemaining?: number | null;

  @IsBoolean()
  isOpen!: boolean;
}
