import { PromotionAssetType } from '../entities/promotion.entity';

export class ClaimPromotionResponseDto {
  promotionId!: string;
  promotionName!: string;
  /** The user's numbered position e.g. 7 = "7th person" */
  slotNumber!: number;
  slotLimit!: number | null;
  assetUrl!: string | null;
  assetType!: PromotionAssetType;
  claimedAt!: Date;
  message!: string;
}
