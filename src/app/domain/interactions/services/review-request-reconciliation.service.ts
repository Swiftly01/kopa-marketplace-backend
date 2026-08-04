import { Injectable, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { DataSource } from 'typeorm';
import { BuyerSellerInteraction } from '../entities/buyer-seller-interaction.entity';
import { ReviewRequestSchedulerService } from './review-request-scheduler.service';
import { RedisHealthService } from '../../../notification/services/redis-health.service';
import { AppLogger } from '../../../logger/logger.service';
import { REVIEW_REQUEST_RECONCILE_BATCH_SIZE } from '../constants';

/**
 * Catches review requests that never made it onto BullMQ because Valkey was
 * down when ReviewRequestSchedulerService.scheduleOrDebounce() was called.
 *
 * Those rows are written with review_request_job_id = NULL (see
 * InteractionService.recordInteraction). This sweeper periodically finds
 * them and retries the enqueue, now that Valkey is presumably back.
 *
 * Postgres is the source of truth here, not a fallback: every interaction is
 * always written first, and BullMQ enqueue is attempted as a fast path on
 * top of that write. This sweeper is what makes the fast path's failures
 * self-healing instead of permanent data loss.
 */
@Injectable()
export class ReviewRequestReconciliationService implements OnModuleInit {
  private running = false;

  constructor(
    private readonly dataSource: DataSource,
    private readonly reviewRequestScheduler: ReviewRequestSchedulerService,
    private readonly redisHealth: RedisHealthService,
    private readonly logger: AppLogger,
  ) {}

  async onModuleInit() {
    await this.reconcile();
  }

  @Cron(CronExpression.EVERY_30_SECONDS)
  async reconcile(): Promise<void> {
    // Cheap short-circuit - RedisHealthService already tracks connection
    // state via the ioredis client's own events, no extra ping needed here.
    if (!this.redisHealth.isAvailable()) return;

    // Guards against overlapping ticks on *this* instance if a sweep runs
    // long. Safe to run this same cron on every replica - see class doc.
    if (this.running) return;
    this.running = true;

    let processed = 0;

    try {
      while (processed < REVIEW_REQUEST_RECONCILE_BATCH_SIZE) {
        const claimed = await this.claimAndReenqueueOne();
        if (!claimed) break;

        processed++;
        // Jitter so a large post-outage backlog doesn't hit BullMQ/Valkey
        // in one burst.
        await this.sleep(50 + Math.floor(Math.random() * 150));
      }

      if (processed > 0) {
        this.logger.log(
          `Reconciled ${processed} review request(s) left pending by a prior Valkey outage`,
          'ReviewRequestReconciliationService',
        );
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      this.logger.error(
        `Review request reconciliation sweep failed: ${errMsg}`,
        err instanceof Error ? err.stack : undefined,
        'ReviewRequestReconciliationService',
      );
    } finally {
      this.running = false;
    }
  }

  /**
   * Claims a single due row and attempts to re-enqueue it, all inside one
   * transaction. Holding the row lock for just this one attempt (bounded by
   * the scheduler's own enqueue timeout) keeps the transaction short and
   * means a failed retry simply leaves the row NULL for the next tick,
   * instead of getting stuck in a half-claimed state.
   */
  private async claimAndReenqueueOne(): Promise<boolean> {
    return this.dataSource.transaction(async (manager) => {
      const rows: { id: string }[] = await manager.query(
        `SELECT id FROM buyer_seller_interactions
         WHERE review_request_job_id IS NULL
           AND review_request_sent_at IS NULL
           AND review_request_scheduled_for IS NOT NULL
         ORDER BY created_at ASC
         LIMIT 1
         FOR UPDATE SKIP LOCKED`,
      );

      if (rows.length === 0) return false;

      const interaction = await manager.findOneOrFail(BuyerSellerInteraction, {
        where: { id: rows[0].id },
      });

      const { jobId, mode } =
        await this.reviewRequestScheduler.scheduleOrDebounce({
          interactionId: interaction.id,
          buyerId: interaction.buyerId,
          sellerId: interaction.sellerId,
          productId: interaction.productId,
        });

      if (mode === 'queued') {
        await manager.update(BuyerSellerInteraction, interaction.id, {
          reviewRequestJobId: jobId,
        });
      }
      // mode === 'pending' (Valkey dropped again mid-sweep): leave the row
      // untouched so the next tick picks it back up.

      return true;
    });
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
