import { Exclude, Expose } from 'class-transformer';
import { ReviewStatus } from '../enums/review-status.enum';

@Exclude()
export class ReviewResponseDto {
  @Expose() id!: string;
  @Expose() buyerId!: string;
  @Expose() sellerId!: string;
  @Expose() productId!: string;
  @Expose() rating!: number;
  @Expose() comment!: string | null;
  @Expose() status!: ReviewStatus;
  @Expose() createdAt!: Date;
  @Expose() updatedAt!: Date;
}
