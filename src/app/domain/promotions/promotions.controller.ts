import { Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { PromotionsService } from './promotions.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PromotionStatusDto } from './dtos/promotion-status-dto';
import { IsPublic } from '../../auth/decorators/public.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { JwtUser } from '../../common/types/request-with-user.interface';
import { ClaimPromotionResponseDto } from './dtos/claim-promotion-response-dto';

@UseGuards(JwtAuthGuard)
@Controller('promotions')
export class PromotionsController {
  constructor(private readonly promotionsService: PromotionsService) {}

  @IsPublic()
  @Get('active')
  async getPromotion() {
    return this.promotionsService.getPromotion();
  }

  @IsPublic()
  @Get(':id/status')
  async getStatus(@Param('id') id: string): Promise<PromotionStatusDto> {
    return this.promotionsService.getStatus(id);
  }

  /**
   * Claims a slot for the logged-in user and returns
   * their slot number + the asset download URL.
   */
  @Post(':id/claim')
  async claim(
    @Param('id') id: string,
    @CurrentUser() user: JwtUser,
  ): Promise<ClaimPromotionResponseDto> {
    return this.promotionsService.claim(id, user);
  }

  /**
   * Lets a logged-in user check if they already claimed
   * and see their slot number without re-claiming.
  
  */
  @Get(':id/my-claim')
  async getMyClaim(@Param('id') id: string, @CurrentUser() user: JwtUser) {
    const claim = await this.promotionsService.getUserClaim(id, user.id);

    return (
      claim ?? {
        claimed: false,
      }
    );
  }
}
