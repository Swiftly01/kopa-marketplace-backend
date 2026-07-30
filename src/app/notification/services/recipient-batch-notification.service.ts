import { Injectable } from '@nestjs/common';
import { NotificationProducerService } from './notification-producer.service';
import { AppLogger } from '../../logger/logger.service';
import { RecipientBatchService } from './recipient-batch.service';
import { BatchFeature } from '../enums/batch-feature.enum';
import { SendNotificationDto } from '../dtos/send-notification.dto';
import { RecipientBatchSendResult } from '../interfaces/recipient-batch.interface';
import { BatchDeliveryStatus } from '../enums/batch-delivery-status.enum';
import { chunk } from '../utils/chunk';
import { MAX_BATCH_RECIPIENTS } from '../constant';

export interface SendToRecipientsParams {
  feature: BatchFeature;
  adminId: string;
  userIds: string[];
  campaignId?: string;
  buildDto: (userId: string, campaignId: string) => SendNotificationDto;
}

@Injectable()
export class RecipientBatchNotificationService {
  constructor(
    private readonly producer: NotificationProducerService,
    private readonly batchService: RecipientBatchService,
    private readonly logger: AppLogger,
  ) {}

  async sendToRecipients(
    params: SendToRecipientsParams,
  ): Promise<RecipientBatchSendResult> {
    const uniqueUserIds = Array.from(new Set(params.userIds));

    this.batchService.assertWithinLimit(uniqueUserIds);

    const batch = await this.batchService.createBatch({
      feature: params.feature,
      createdBy: params.adminId,
      userIds: uniqueUserIds,
      campaignId: params.campaignId,
    });

    try {
      let totalQueued = 0;

      for (const group of chunk(uniqueUserIds, MAX_BATCH_RECIPIENTS)) {
        await this.producer.sendBulk(
          group.map((userId) => params.buildDto(userId, batch.campaignId)),
        );
        totalQueued += group.length;
      }

      const updated = await this.batchService.updateStatus(
        batch,
        BatchDeliveryStatus.QUEUED,
        totalQueued,
      );

      this.logger.log(
        `Recipient batch dispatched: batch=${updated.batchId} feature=${updated.feature} admin=${updated.createdBy} queued=${totalQueued}`,
        'RecipientBatchNotificationService',
      );

      return this.toResult(updated);
    } catch (err) {
      await this.batchService.updateStatus(batch, BatchDeliveryStatus.FAILED);

      const errMsg = err instanceof Error ? err.message : String(err);
      this.logger.warn(
        `Recipient batch dispatch failed: batch=${batch.batchId} feature=${batch.feature} error=${errMsg}`,
      );

      throw err;
    }
  }

  private toResult(batch: {
    batchId: string;
    campaignId: string;
    totalQueued: number;
    status: BatchDeliveryStatus;
    sentAt: string;
    expiresAt: string;
  }): RecipientBatchSendResult {
    return {
      batchId: batch.batchId,
      campaignId: batch.campaignId,
      totalQueued: batch.totalQueued,
      status: batch.status,
      sentAt: batch.sentAt,
      expiresAt: batch.expiresAt,
    };
  }
}
