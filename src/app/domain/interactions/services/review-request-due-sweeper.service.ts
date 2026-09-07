import { Injectable, OnModuleInit } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { ReviewRequestSenderService } from './review-request-sender.service';
import { AppLogger } from '../../../logger/logger.service';
import {
  REVIEW_REQUEST_DUE_SWEEP_BATCH_SIZE,
  REVIEW_REQUEST_DUE_SWEEP_CLAIM_PREFIX,
  REVIEW_REQUEST_DUE_SWEEP_MAX_ATTEMPTS,
} from '../constants';
import { Cron, CronExpression } from '@nestjs/schedule';

interface ClaimedRow {
  id: string;
  buyer_id: string;
  seller_id: string;
  product_id: string;
  review_request_attempts: number;
}

@Injectable()
export class ReviewRequestDueSweeperService implements OnModuleInit {
  private running = false;

  constructor(
    private readonly dataSource: DataSource,
    private readonly reviewRequestSender: ReviewRequestSenderService,
    private readonly logger: AppLogger,
  ) {}

  async onModuleInit() {
    await this.sweep();
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async sweep(): Promise<void> {
    if (this.running) return;
    this.running = true;

    let sent = 0;
    let skipped = 0;
    let failed = 0;

    try {
      while (true) {
        const batch = await this.claimBatch();
        if (batch.length === 0) break;

        for (const row of batch) {
          try {
            const outcome = await this.reviewRequestSender.send(
              {
                interactionId: row.id,
                buyerId: row.buyer_id,
                sellerId: row.seller_id,
                productId: row.product_id,
              },
              'due-sweep',
            );

            if (outcome === 'sent') {
              sent++;
            } else {
              skipped++;
            }
          } catch (err) {
            failed++;
            const errMsg = err instanceof Error ? err.message : String(err);

            // review_request_attempts on the row already reflects this
            // attempt's increment, since it comes from the claim's RETURNING.
            if (
              row.review_request_attempts >=
              REVIEW_REQUEST_DUE_SWEEP_MAX_ATTEMPTS
            ) {
              this.logger.error(
                `Review request for interaction=${row.id} failed ${row.review_request_attempts} times and exceeded the retry ceiling; leaving for manual follow-up: ${errMsg}`,
                err instanceof Error ? err.stack : undefined,
                'ReviewRequestDueSweeperService',
              );
            } else {
              this.logger.warn(
                `Review request send failed for interaction=${row.id} (attempt ${row.review_request_attempts}): ${errMsg}`,
                'ReviewRequestDueSweeperService',
              );
            }
          }
        }

        if (batch.length < REVIEW_REQUEST_DUE_SWEEP_BATCH_SIZE) break;
      }

      if (sent || skipped || failed) {
        this.logger.log(
          `Due-sweep complete: sent=${sent} skipped=${skipped} failed=${failed}`,
          'ReviewRequestDueSweeperService',
        );
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      this.logger.error(
        `Review request due-sweep failed: ${errMsg}`,
        err instanceof Error ? err.stack : undefined,
        'ReviewRequestDueSweeperService',
      );
    } finally {
      this.running = false;
    }
  }

  private async claimBatch(): Promise<ClaimedRow[]> {
    return this.dataSource.query(
      `UPDATE buyer_seller_interactions
       SET review_request_attempts = review_request_attempts + 1,
           review_request_last_attempt_at = NOW(),
           review_request_job_id = $1 || id::text || ':' || extract(epoch from now())::text
       WHERE id IN (
         SELECT id
         FROM buyer_seller_interactions
         WHERE review_request_sent_at IS NULL
           AND review_request_scheduled_for IS NOT NULL
           AND review_request_scheduled_for <= NOW()
           AND review_request_attempts < $2
           AND (review_request_last_attempt_at IS NULL
                OR review_request_last_attempt_at < NOW() - INTERVAL '90 seconds')
         ORDER BY review_request_scheduled_for ASC
         LIMIT $3
         FOR UPDATE SKIP LOCKED
       )
       RETURNING id, buyer_id, seller_id, product_id, review_request_attempts`,
      [
        REVIEW_REQUEST_DUE_SWEEP_CLAIM_PREFIX,
        REVIEW_REQUEST_DUE_SWEEP_MAX_ATTEMPTS,
        REVIEW_REQUEST_DUE_SWEEP_BATCH_SIZE,
      ],
    );
  }
}
