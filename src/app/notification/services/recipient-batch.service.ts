import { BadRequestException, Injectable } from '@nestjs/common';
import { BatchFeature } from '../enums/batch-feature.enum';
import { RedisService } from '../../redis/redis.service';
import { AppLogger } from '../../logger/logger.service';
import {
  BATCH_REDIS_PREFIX,
  BATCH_TTL_SECONDS,
  MAX_BATCH_RECIPIENTS,
} from '../constant';
import { RecipientBatch } from '../interfaces/recipient-batch.interface';
import { randomUUID } from 'crypto';
import { BatchDeliveryStatus } from '../enums/batch-delivery-status.enum';

interface CreateBatchParams {
  feature: BatchFeature;
  createdBy: string;
  userIds: string[];
  campaignId?: string;
}

@Injectable()
export class RecipientBatchService {
  constructor(
    private readonly redis: RedisService,
    private readonly logger: AppLogger,
  ) {}

  assertWithinLimit(userIds: string[]): void {
    if (userIds.length === 0) {
      throw new BadRequestException('At least one recipent is required');
    }

    if (userIds.length > MAX_BATCH_RECIPIENTS) {
      throw new BadRequestException(
        `Only ${MAX_BATCH_RECIPIENTS} users can be sent to at a time. ` +
          `You selected ${userIds.length}. Please split this into multiple batches.`,
      );
    }
  }

  async createBatch(params: CreateBatchParams): Promise<RecipientBatch> {
    const uniqueUserIds = Array.from(new Set(params.userIds));
    this.assertWithinLimit(uniqueUserIds);

    const now = new Date();
    const expiresAt = new Date(now.getTime() + BATCH_TTL_SECONDS * 1000);

    const batch: RecipientBatch = {
      batchId: randomUUID(),
      feature: params.feature,
      createdBy: params.createdBy,
      userIds: uniqueUserIds,
      campaignId: params.campaignId ?? randomUUID(),
      totalQueued: 0,
      status: BatchDeliveryStatus.PENDING,
      sentAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
    };

    await this.persist(batch, BATCH_TTL_SECONDS);
    await this.redis.addToSet(
      this.indexKey(params.feature, params.createdBy),
      batch.batchId,
      BATCH_TTL_SECONDS,
    );

    this.logger.log(
      `Recipient batch created: batch=${batch.batchId} feature=${batch.feature} admin=${batch.createdBy} recipients=${uniqueUserIds.length}`,
      'RecipientBatchService',
    );

    return batch;
  }

  async updateStatus(
    batch: RecipientBatch,
    status: BatchDeliveryStatus,
    totalQueued?: number,
  ): Promise<RecipientBatch> {
    const updated: RecipientBatch = {
      ...batch,
      status,
      totalQueued: totalQueued ?? batch.totalQueued,
    };

    const remainingTtl = Math.max(
      1,
      Math.floor(new Date(updated.expiresAt).getTime() - Date.now() / 1000),
    );

    await this.persist(updated, remainingTtl);
    return updated;
  }

  async getActiveBatches(
    feature: BatchFeature,
    adminId: string,
  ): Promise<RecipientBatch[]> {
    const batchIds = await this.redis.setMembers(
      this.indexKey(feature, adminId),
    );

    const batches: RecipientBatch[] = [];
    for (const batchId of batchIds) {
      const raw = await this.redis.getValue(
        this.batchKey(feature, adminId, batchId),
      );

      if (!raw) {
        await this.redis.removeFromSet(
          this.indexKey(feature, adminId),
          batchId,
        );
        continue;
      }

      batches.push(JSON.parse(raw) as RecipientBatch);
    }

    return batches.sort(
      (a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime(),
    );
  }

  async getProcessedUserIds(
    feature: BatchFeature,
    adminId: string,
  ): Promise<string[]> {
    const batches = await this.getActiveBatches(feature, adminId);
    const ids = new Set<string>();
    for (const batch of batches) {
      for (const userId of batch.userIds) ids.add(userId);
    }
    return Array.from(ids);
  }

  private async persist(
    batch: RecipientBatch,
    ttlSeconds: number,
  ): Promise<void> {
    await this.redis.setValue(
      this.batchKey(batch.feature, batch.createdBy, batch.batchId),
      JSON.stringify(batch),
      ttlSeconds,
    );
  }

  private batchKey(
    feature: BatchFeature,
    adminId: string,
    batchId: string,
  ): string {
    return `${BATCH_REDIS_PREFIX}_${feature}_${adminId}_${batchId}`;
  }

  private indexKey(feature: BatchFeature, adminId: string): string {
    return `${BATCH_REDIS_PREFIX}_index_${feature}_${adminId}`;
  }
}
