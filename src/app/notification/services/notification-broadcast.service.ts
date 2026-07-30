import { BadRequestException, Injectable } from '@nestjs/common';
import {
  BroadcastAudience,
  BroadcastNotificationDto,
} from '../dtos/broadcast-notification.dto';
import { User } from '../../domain/users/entities/user.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotificationProducerService } from './notification-producer.service';
import { AppLogger } from '../../logger/logger.service';
import { randomUUID } from 'crypto';
import { SendNotificationDto } from '../dtos/send-notification.dto';
import { UserStatus } from '../../common/enums/user-status.enum';
import { BatchDeliveryStatus } from '../enums/batch-delivery-status.enum';
import { RecipientBatchNotificationService } from './recipient-batch-notification.service';
import { BatchFeature } from '../enums/batch-feature.enum';
const ALL_AUDIENCE_BATCH_SIZE = 500;

export interface AudienceEstimateQuery {
  audience: BroadcastAudience;
  userIds?: string[];
  roleFilter?: string;
}

export interface BroadcastResult {
  totalQueued: number;
  campaignId: string;
  batchId?: string;
  status?: BatchDeliveryStatus;
  expiresAt?: string;
}
@Injectable()
export class NotificationBroadcastService {
  constructor(
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    private readonly producer: NotificationProducerService,
    private readonly recipientBatchNotification: RecipientBatchNotificationService,
    private readonly logger: AppLogger,
  ) {}

  async broadcast(
    dto: BroadcastNotificationDto,
    adminId?: string,
  ): Promise<BroadcastResult> {
    if (dto.audience === BroadcastAudience.SPECIFIC) {
      if (!dto.userIds || dto.userIds.length === 0) {
        throw new BadRequestException(
          'userIds is required when audience is "specific"',
        );
      }

      if (!adminId) {
        throw new BadRequestException(
          `AdminId is required for: ${dto.audience}`,
        );
      }

      const result = await this.recipientBatchNotification.sendToRecipients({
        feature: BatchFeature.BROADCAST,
        adminId,
        userIds: dto.userIds,
        campaignId: dto.broadcastKey,
        buildDto: (userId, campaignId) =>
          this.toSendDto(dto, userId, campaignId),
      });

      return {
        totalQueued: result.totalQueued,
        campaignId: result.campaignId,
        batchId: result.batchId,
        status: result.status,
        expiresAt: result.expiresAt,
      };
    }

    const campaignId = dto.broadcastKey ?? randomUUID();
    const totalQueued = await this.broadcastToAllUsers(dto, campaignId);
    return { totalQueued, campaignId };
  }

  async estimateAudience(query: AudienceEstimateQuery): Promise<number> {
    if (query.audience === BroadcastAudience.SPECIFIC) {
      return query.userIds?.length ?? 0;
    }

    const qb = this.userRepository
      .createQueryBuilder('user')
      .where('user.status = :status', { status: UserStatus.Active });

    if (query.roleFilter) {
      qb.andWhere('user.role = :role', { role: query.roleFilter });
    }

    return qb.getCount();
  }

  private async broadcastToAllUsers(
    dto: BroadcastNotificationDto,
    campaignId: string,
  ): Promise<number> {
    let totalQueued = 0;
    let batchCount = 0;
    let lastId: string | null = null;
    for (;;) {
      const qb = this.userRepository
        .createQueryBuilder('user')
        .select(['user.id'])
        .where('user.status = :status', { status: UserStatus.Active })
        .orderBy('user.id', 'ASC')
        .limit(ALL_AUDIENCE_BATCH_SIZE);

      if (dto.roleFilter) {
        qb.andWhere('user.role = :role', { role: dto.roleFilter });
      }
      if (lastId) {
        qb.andWhere('user.id > :lastId', { lastId });
      }

      const batch = await qb.getMany();
      if (batch.length === 0) break;

      await this.producer.sendBulk(
        batch.map((u) => this.toSendDto(dto, u.id, campaignId)),
      );

      totalQueued += batch.length;
      batchCount += 1;
      lastId = batch[batch.length - 1].id;

      if (batch.length < ALL_AUDIENCE_BATCH_SIZE) break; // reached the last page
    }

    this.logger.log(
      `Broadcast (all users) queued: ${totalQueued} recipient(s) across ${batchCount} batch(es), campaign=${campaignId}`,
      'NotificationBroadcastService',
    );

    return totalQueued;
  }

  private toSendDto(
    dto: BroadcastNotificationDto,
    userId: string,
    campaignId: string,
  ): SendNotificationDto {
    return {
      userId,
      type: dto.type,
      title: dto.title,
      body: dto.body,
      html: dto.bodyHtml,
      data: dto.data,
      channels: dto.channels,
      priority: dto.priority,
      scheduledFor: dto.scheduledFor,
      idempotencyKey: `broadcast_${campaignId}_${userId}`,
    };
  }
}
