import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { JwtUser } from '../../common/types/request-with-user.interface';
import { ClaimPromotionResponseDto } from './dtos/claim-promotion-response-dto';
import { PromotionStatusDto } from './dtos/promotion-status-dto';
import { PromotionClaim } from './entities/promotion-claim.entity';
import { Promotion, PromotionStatus } from './entities/promotion.entity';

@Injectable()
export class PromotionsService {
  constructor(
    @InjectRepository(Promotion)
    private readonly promotionRepo: Repository<Promotion>,

    @InjectRepository(PromotionClaim)
    private readonly claimRepo: Repository<PromotionClaim>,

    private readonly dataSource: DataSource,
  ) {}

  async getPromotion() {
    const promotion = await this.promotionRepo.findOne({
      where: { status: PromotionStatus.ACTIVE },
    });

    if (!promotion) {
      throw new NotFoundException('No active promotion');
    }

    return {
      promotionId: promotion.id,
      name: promotion.name,
      description: promotion.description,
      assetType: promotion.assetType,
      slotLimit: promotion.slotLimit,
    };
  }

  /**
   * Returns the public status of a promotion:
   * how many slots are taken, total slots, and whether it's still open.
   */
  async getStatus(promotionId: string): Promise<PromotionStatusDto> {
    const promotion = await this.findActiveOrFail(promotionId);

    const claimedCount = await this.claimRepo.count({
      where: { promotion: { id: promotionId } },
    });

    const slotsRemaining =
      promotion.slotLimit !== null
        ? Math.max(0, promotion.slotLimit - claimedCount)
        : null;

    return {
      promotionId: promotion.id,
      name: promotion.name,
      description: promotion.description,
      assetType: promotion.assetType,
      slotLimit: promotion.slotLimit,
      claimedCount,
      slotsRemaining,
      isOpen:
        promotion.status === PromotionStatus.ACTIVE &&
        (promotion.slotLimit === null || claimedCount < promotion.slotLimit),
    };
  }

  /**
   * Atomically claims a promotion slot for a user.
   *
   * Uses a serializable transaction + SELECT COUNT with locking to prevent
   * race conditions where two users simultaneously claim the last slot.
   */

  async claim(
    promotionId: string,
    user: JwtUser,
  ): Promise<ClaimPromotionResponseDto> {
    return this.dataSource.transaction('SERIALIZABLE', async (manager) => {
      // Lock the promotion row to serialize concurrent claims
      const promotion = await manager
        .getRepository(Promotion)
        .createQueryBuilder('promo')
        .setLock('pessimistic_write')
        .where('promo.id = :id', { id: promotionId })
        .getOne();

      if (!promotion) {
        throw new NotFoundException('Promotion not found');
      }

      if (promotion.status !== PromotionStatus.ACTIVE) {
        throw new ForbiddenException('This promotion is no longer active');
      }

      this.assertWithinDateWindow(promotion);

      const existingClaim = await manager
        .getRepository(PromotionClaim)
        .findOne({
          where: {
            promotion: { id: promotionId },
            user: { id: user.id },
          },
        });

      if (existingClaim) {
        throw new ConflictException(
          `You have already claimed this promotion (slot #${existingClaim.slotNumber})`,
        );
      }
      // Count current claims atomically (inside the locked transaction)
      const claimedCount = await manager.getRepository(PromotionClaim).count({
        where: { promotion: { id: promotionId } },
      });

      if (promotion.slotLimit !== null && claimedCount >= promotion.slotLimit) {
        throw new ForbiddenException(
          'All slots for this promotion have been claimed',
        );
      }

      const slotNumber = claimedCount + 1;

      const claim = manager.getRepository(PromotionClaim).create({
        promotion,
        user,
        slotNumber,
        assetUrl: promotion.assetUrl,
      });

      await manager.getRepository(PromotionClaim).save(claim);

      const isLastSlot = slotNumber === promotion.slotLimit;

      if (isLastSlot) {
        await manager.getRepository(Promotion).update(promotion.id, {
          status: PromotionStatus.ENDED,
        });
      }

      return {
        promotionId: promotion.id,
        promotionName: promotion.name,
        slotNumber,
        slotLimit: promotion.slotLimit,
        assetUrl: promotion.assetUrl,
        assetType: promotion.assetType,
        claimedAt: claim.claimedAt,
        message: `Congratulations! You are #${slotNumber} of ${promotion.slotLimit ?? '∞'}. Your download is ready.`,
      };
    });
  }

  /**
   * Check if the current user has already claimed a given promotion,
   * and return their slot info if so.
   */

  async getUserClaim(
    promotionId: string,
    userId: string,
  ): Promise<PromotionClaim | null> {
    return this.claimRepo.findOne({
      where: {
        promotion: { id: promotionId },
        user: { id: userId },
      },
    });
  }

  private async findActiveOrFail(promotionId: string): Promise<Promotion> {
    const promotion = await this.promotionRepo.findOne({
      where: { id: promotionId },
    });

    if (!promotion) {
      throw new NotFoundException('Promotion not found');
    }

    return promotion;
  }

  private assertWithinDateWindow(promotion: Promotion): void {
    const now = new Date();

    if (promotion.startsAt && now < promotion.startsAt) {
      throw new ForbiddenException('This promotion has not started yet');
    }

    if (promotion.endsAt && now > promotion.endsAt) {
      throw new ForbiddenException('This promotion has ended');
    }
  }
}
