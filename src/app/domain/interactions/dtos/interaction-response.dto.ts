import { Exclude, Expose } from 'class-transformer';
import { InteractionType } from '../enums/interaction-type.enum';

@Exclude()
export class InteractionResponseDto {
  @Expose() id!: string;
  @Expose() buyerId!: string;
  @Expose() sellerId!: string;
  @Expose() productId!: string;
  @Expose() type!: InteractionType;
  @Expose() reviewRequestScheduledFor!: Date | null;
  @Expose() createdAt!: Date;
}
