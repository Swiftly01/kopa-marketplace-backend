import { ForbiddenException, Injectable } from '@nestjs/common';
import { InteractionService } from '../../interactions/services/interaction.service';

export interface ReviewEligibility {
  eligible: boolean;
  reason?: string;
}

@Injectable()
export class ReviewEligibilityService {
  constructor(private readonly interactionService: InteractionService) {}

  async checkEligibility(
    buyerId: string,
    sellerId: string,
    productId: string,
  ): Promise<ReviewEligibility> {
    const hasInteraction = await this.interactionService.hasInteraction(
      buyerId,
      sellerId,
      productId,
    );

    if (!hasInteraction) {
      return {
        eligible: false,
        reason:
          'You can only review a seller/product after contacting the seller via WhatsApp or a call.',
      };
    }

    return { eligible: true };
  }

  async assertCanReview(
    buyerId: string,
    sellerId: string,
    productId: string,
  ): Promise<void> {
    const { eligible, reason } = await this.checkEligibility(
      buyerId,
      sellerId,
      productId,
    );

    if (!eligible) {
      throw new ForbiddenException(reason);
    }
  }
}
