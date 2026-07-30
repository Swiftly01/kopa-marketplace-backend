import { BatchFeature } from '../enums/batch-feature.enum';
import { BatchDeliveryStatus } from '../enums/batch-delivery-status.enum';

export interface RecipientBatch {
  batchId: string;
  feature: BatchFeature;
  createdBy: string;
  userIds: string[];
  campaignId: string;
  totalQueued: number;
  status: BatchDeliveryStatus;
  sentAt: string;
  expiresAt: string;
}

export interface RecipientBatchSendResult {
  batchId: string;
  campaignId: string;
  totalQueued: number;
  status: BatchDeliveryStatus;
  sentAt: string;
  expiresAt: string;
}
