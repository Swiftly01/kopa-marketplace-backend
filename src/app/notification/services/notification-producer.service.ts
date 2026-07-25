import { Injectable } from '@nestjs/common';
import {
  SynchronousFallbackService,
  SyncSendResult,
} from './synchronous-fallback.service';
import { DEFAULT_JOB_OPTIONS, QUEUE_NAMES } from '../constant';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { AppLogger } from '../../logger/logger.service';
import { RedisHealthService } from './redis-health.service';
import { ConfigService } from '@nestjs/config';
import { SendNotificationDto } from '../dtos/send-notification.dto';
import { randomUUID } from 'crypto';
import { deriveIdempotencyKey } from '../utils/idempotency';
import { NotificationPriority } from '../enums/notification-priority.enum';
import { DispatchJobData } from '../interfaces/notification-job.interface';

export interface QueuedSendResult {
  mode: 'queued';
  notificationRequestId: string;
}

export type NotificationSendResult = QueuedSendResult | SyncSendResult;

const ENQUEUE_TIMEOUT_MS = 1500;

@Injectable()
export class NotificationProducerService {
  private readonly syncFallbackEnabled: boolean;

  constructor(
    @InjectQueue(QUEUE_NAMES.DISPATCH)
    private readonly dispatchQueue: Queue,
    private readonly logger: AppLogger,
    private readonly redisHealth: RedisHealthService,
    private readonly synchronousFallback: SynchronousFallbackService,
    private readonly configService: ConfigService,
  ) {
    this.syncFallbackEnabled = this.configService.get<boolean>(
      'notificationConfig.enableSyncFallback',
      true,
    );
  }

  async send(dto: SendNotificationDto): Promise<NotificationSendResult> {
    const notificationRequestId = randomUUID();

    if (this.syncFallbackEnabled && !this.redisHealth.isAvailable()) {
      return this.synchronousFallback.sendNow(dto, notificationRequestId);
    }

    try {
      await this.enqueueWithTimeout(dto, notificationRequestId);
      return { mode: 'queued', notificationRequestId };
    } catch (err) {
      if (!this.syncFallbackEnabled) throw err;

      const errMsg = err instanceof Error ? err.message : String(err);

      this.logger.warn(
        `Enqueue failed/timeout, falling back to synchronous send: ${errMsg}`,
      );

      return this.synchronousFallback.sendNow(dto, notificationRequestId);
    }
  }

  private async enqueueWithTimeout(
    dto: SendNotificationDto,
    notificationRequestId: string,
  ): Promise<void> {
    const idempotencyKey =
      dto.idempotencyKey ??
      deriveIdempotencyKey({
        userId: dto.userId,
        type: dto.type,
        body: dto.body,
        data: dto.data,
      });

    const priority = dto.priority ?? NotificationPriority.NORMAL;

    const jobData: DispatchJobData = {
      notificationRequestId,
      userId: dto.userId,
      type: dto.type,
      title: dto.title,
      body: dto.body,
      html: dto.html,
      data: dto.data,
      priority,
      channels: dto.channels,
      idempotencyKey,
    };

    const delay = this.computeDelay(dto.scheduledFor);
    await this.withTimeout(
      this.dispatchQueue.add(dto.type, jobData, {
        ...DEFAULT_JOB_OPTIONS,
        jobId: idempotencyKey,
        priority,
        delay,
      }),
      ENQUEUE_TIMEOUT_MS,
    );

    this.logger.log(
      `Notification dispatch queued: user=${dto.userId} type=${dto.type} key=${idempotencyKey}`,
      'NotificationProducerService',
    );
  }

  async sendBulk(
    dtos: SendNotificationDto[],
  ): Promise<{ notificationRequestId: string }[]> {
    const prepared = dtos.map((dto) => {
      const idempotencyKey =
        dto.idempotencyKey ??
        deriveIdempotencyKey({
          userId: dto.userId,
          type: dto.type,
          body: dto.body,
          data: dto.data,
        });

      const notificationRequestId = randomUUID();
      const priority = dto.priority ?? NotificationPriority.NORMAL;

      const jobData: DispatchJobData = {
        notificationRequestId,
        userId: dto.userId,
        type: dto.type,
        title: dto.title,
        body: dto.body,
        html: dto.html,
        data: dto.data,
        priority,
        channels: dto.channels,
        idempotencyKey,
      };

      return {
        name: dto.type,
        data: jobData,
        opts: {
          ...DEFAULT_JOB_OPTIONS,
          jobId: idempotencyKey,
          priority,
          delay: this.computeDelay(dto.scheduledFor),
        },
        notificationRequestId,
      };
    });

    await this.dispatchQueue.addBulk(
      prepared.map(({ name, data, opts }) => ({
        name,
        data,
        opts,
      })),
    );

    const waiting = await this.dispatchQueue.getWaitingCount();
    const active = await this.dispatchQueue.getActiveCount();
    const delayed = await this.dispatchQueue.getDelayedCount();
    const failed = await this.dispatchQueue.getFailedCount();

    this.logger.log(
      `Dispatch queue -> waiting=${waiting}, active=${active}, delayed=${delayed}, failed=${failed}`,
      'NotificationProducerService',
    );

    this.logger.log(
      `Bulk notification dispatch queued: count=${prepared.length}`,
      'NotificationProducerService',
    );

    return prepared.map((p) => ({
      notificationRequestId: p.notificationRequestId,
    }));
  }

  private computeDelay(scheduledFor?: string): number {
    if (!scheduledFor) return 0;
    const delay = new Date(scheduledFor).getTime() - Date.now();
    return Math.max(delay, 0);
  }

  withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(
        () => reject(new Error(`Operation timed out after ${ms}ms`)),
        ms,
      );
      promise.then(
        (value) => {
          clearTimeout(timer);
          resolve(value);
        },
        (err: Error) => {
          clearTimeout(timer);
          reject(err);
        },
      );
    });
  }
}
