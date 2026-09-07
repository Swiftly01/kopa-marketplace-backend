import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Job } from 'bullmq';
import { AppLogger } from '../../../logger/logger.service';
import { INTERACTION_QUEUE_NAMES } from '../constants';
import { ReviewRequestJobData } from '../interfaces/review-request-job.interface';
import { ReviewRequestSenderService } from '../services/review-request-sender.service';

@Injectable()
@Processor(INTERACTION_QUEUE_NAMES.REVIEW_REQUEST, { concurrency: 10 })
export class ReviewRequestProcessor extends WorkerHost {
  constructor(
    private readonly reviewRequestSender: ReviewRequestSenderService,
    private readonly logger: AppLogger,
  ) {
    super();
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job, err: Error) {
    this.logger.error(
      `Review request job=${job?.id} failed: ${err.message}`,
      err.stack,
      'ReviewRequestProcessor',
    );
  }

  async process(job: Job<ReviewRequestJobData>): Promise<void> {
    await this.reviewRequestSender.send(job.data, 'queue');
  }
}
