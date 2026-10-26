import {
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThanOrEqual, Repository } from 'typeorm';
import { BuyerSellerInteraction } from '../entities/buyer-seller-interaction.entity';
import { EngagementTargetService } from '../../engagement/engagement-target.service';
import { ReviewRequestSchedulerService } from './review-request-scheduler.service';
import { PaginationProvider } from '../../../common/pagination/providers/pagination.provider';
import { CreateInteractionDto } from '../dtos/create-interaction.dto';
import { AppLogger } from '../../../logger/logger.service';
import { PaginationQueryDto } from '../../../common/pagination/dtos/pagination-query.dto';

@Injectable()
export class InteractionService {
  constructor(
    @InjectRepository(BuyerSellerInteraction)
    private readonly interactionRepository: Repository<BuyerSellerInteraction>,
    private readonly targets: EngagementTargetService,
    private readonly reviewRequestScheduler: ReviewRequestSchedulerService,
    private readonly paginationProvider: PaginationProvider,
    private readonly logger: AppLogger,
  ) {}

  async recordInteraction(
    buyerId: string,
    dto: CreateInteractionDto,
  ): Promise<BuyerSellerInteraction> {
    // dto.productId is the id of a product OR of an ad
    const target = await this.targets.resolve(dto.productId);

    if (!target) {
      throw new NotFoundException('Product not found');
    }

    if (target.sellerId !== dto.sellerId) {
      throw new UnprocessableEntityException(
        'The product does not belong to the specified seller',
      );
    }

    const interaction = this.interactionRepository.create({
      buyerId,
      sellerId: dto.sellerId,
      productId: target.kind === 'product' ? target.id : null,
      listingId: target.kind === 'listing' ? target.id : null,
      type: dto.type,
    });

    const saved = await this.interactionRepository.save(interaction);

    // review-request reminders exist for products only; for ads the buyer
    // can still review from the ad page once the 24h eligibility window passes
    if (target.kind === 'listing') {
      return saved;
    }

    const { jobId, scheduledFor, mode } =
      await this.reviewRequestScheduler.scheduleOrDebounce({
        interactionId: saved.id,
        buyerId,
        sellerId: dto.sellerId,
        productId: target.id,
      });

    saved.reviewRequestJobId = jobId;
    saved.reviewRequestScheduledFor = scheduledFor;
    await this.interactionRepository.save(saved);

    if (mode === 'pending') {
      this.logger.warn(
        `Review request for interaction=${saved.id} could not be queued (Valkey unavailable); left pending for reconciliation`,
        'InteractionService',
      );
    }

    this.logger.log(
      `Interaction recorded: buyer=${buyerId} seller=${dto.sellerId} product=${dto.productId} type=${dto.type}`,
    );

    return saved;
  }

  async findMine(buyerId: string, query: PaginationQueryDto, baseUrl?: string) {
    const qb = this.interactionRepository
      .createQueryBuilder('interaction')
      .where('interaction.buyer_id = :buyerId', { buyerId })
      .orderBy('interaction.created_at', 'DESC');

    return this.paginationProvider.paginateQuery(qb, query, baseUrl);
  }

  async hasInteraction(
    buyerId: string,
    sellerId: string,
    targetId: string,
  ): Promise<boolean> {
    const oldEnough = LessThanOrEqual(
      new Date(Date.now() - 24 * 60 * 60 * 1000),
    );
    // targetId is a product id or an ad id; only one of the two columns can match
    const interaction = await this.interactionRepository.findOne({
      where: [
        { buyerId, sellerId, productId: targetId, createdAt: oldEnough },
        { buyerId, sellerId, listingId: targetId, createdAt: oldEnough },
      ],
    });

    return !!interaction;
  }
}
