import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import {
  buildReviewRequestJobId,
  INTERACTION_QUEUE_NAMES,
  REVIEW_REQUEST_ENQUEUE_TIMEOUT_MS,
  REVIEW_REQUEST_JOB_NAME,
} from '../constants';
import { Queue } from 'bullmq';
import { ReviewRequestJobData } from '../interfaces/review-request-job.interface';
import { ConfigService } from '@nestjs/config';
import { AppLogger } from '../../../logger/logger.service';
import { RedisHealthService } from '../../../notification/services/redis-health.service';

export interface ScheduleResult {
  // null while a job could not be placed on the queue (Valkey unavailable or
  // the enqueue call timed out) - the interaction row is written with this
  // and picked up later by ReviewRequestReconciliationService.
  jobId: string | null;
  scheduledFor: Date;
  mode: 'queued' | 'pending';
}

@Injectable()
export class ReviewRequestSchedulerService {
  constructor(
    @InjectQueue(INTERACTION_QUEUE_NAMES.REVIEW_REQUEST)
    private readonly reviewRequestQueue: Queue<ReviewRequestJobData>,
    private readonly configService: ConfigService,
    private readonly redisHealth: RedisHealthService,
    private readonly logger: AppLogger,
  ) {}

  /**
   * Schedules a delayed review-request job, debouncing repeat contact
   * between the same buyer/seller/product within the delay window.
   *
   * This method never throws on a Valkey outage. If the queue can't be
   * reached (or the call times out), it returns mode: 'pending' instead of
   * propagating the error - the caller persists that as-is, and
   * ReviewRequestReconciliationService retries once Valkey is back.
   */
  async scheduleOrDebounce(
    data: ReviewRequestJobData,
  ): Promise<ScheduleResult> {
    const delayMinutes = this.configService.get<number>(
      'interactionConfig.reviewRequestDelayMinutes',
      24 * 60,
    );

    const delayMs = delayMinutes * 60 * 1000;
    const scheduledFor = new Date(Date.now() + delayMs);
    const jobId = buildReviewRequestJobId(
      data.buyerId,
      data.sellerId,
      data.productId,
    );

    if (!this.redisHealth.isAvailable()) {
      this.logger.warn(
        `Valkey unavailable - recording review request job=${jobId} as pending for reconciliation`,
        'ReviewRequestSchedulerService',
      );
      return { jobId: null, scheduledFor, mode: 'pending' };
    }

    try {
      return await this.withTimeout(
        this.enqueue(data, jobId, delayMs, scheduledFor),
        REVIEW_REQUEST_ENQUEUE_TIMEOUT_MS,
      );
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      this.logger.warn(
        `Enqueue failed/timed out for review request job=${jobId}: ${errMsg}. Recording as pending for reconciliation`,
        'ReviewRequestSchedulerService',
      );
      return { jobId: null, scheduledFor, mode: 'pending' };
    }
  }

  private async enqueue(
    data: ReviewRequestJobData,
    jobId: string,
    delayMs: number,
    scheduledFor: Date,
  ): Promise<ScheduleResult> {
    const existing = await this.reviewRequestQueue.getJob(jobId);

    if (existing) {
      const state = await existing.getState();

      if (state === 'delayed' || state === 'waiting') {
        await existing.remove();
        this.logger.log(
          `Debouncing review request job=${jobId}: extending delay after repeat contact`,
          'ReviewRequestSchedulerService',
        );
      } else {
        this.logger.log(
          `Existing review request job=${jobId} in state=${state}; not rescheduling`,
          'ReviewRequestSchedulerService',
        );

        return { jobId, scheduledFor, mode: 'queued' };
      }
    }

    await this.reviewRequestQueue.add(REVIEW_REQUEST_JOB_NAME, data, {
      jobId,
      delay: delayMs,
      attempts: 5,
      backoff: { type: 'exponential', delay: 5000 },
      removeOnComplete: { age: 60 * 60 * 24 },
      removeOnFail: { age: 60 * 60 * 7 },
    });

    this.logger.log(
      `Scheduled review request job=${jobId} delayMinutes=${delayMs / 60_000}`,
      'ReviewRequestSchedulerService',
    );

    return { jobId, scheduledFor, mode: 'queued' };
  }

  async cancel(
    buyerId: string,
    sellerId: string,
    productId: string,
  ): Promise<void> {
    if (!this.redisHealth.isAvailable()) return;

    const jobId = buildReviewRequestJobId(buyerId, sellerId, productId);

    try {
      const job = await this.reviewRequestQueue.getJob(jobId);
      if (!job) return;

      const state = await job.getState();
      if (state === 'delayed' || state === 'waiting') {
        await job.remove();
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      this.logger.warn(
        `Could not cancel review request job=${jobId}: ${errMsg}`,
        'ReviewRequestSchedulerService',
      );
    }
  }

  private withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
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
