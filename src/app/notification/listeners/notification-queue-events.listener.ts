import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, OnApplicationShutdown } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Queue, QueueEvents } from 'bullmq';
import { Repository } from 'typeorm';
import { AppLogger } from '../../logger/logger.service';
import { QUEUE_NAMES } from '../constant';
import { Notification } from '../entities/notification.entity';
import { NotificationStatus } from '../enums/notification-status.enum';
import { buildRedisConnectionOptions } from '../redis/redis-connection.provider';

@Injectable()
export class NotificationQueueEventsListener implements OnApplicationShutdown {
  private readonly queueEvents: QueueEvents[] = [];

  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
    private readonly logger: AppLogger,
    private readonly configService: ConfigService,
    @InjectQueue(QUEUE_NAMES.EMAIL) emailQueue: Queue,
    @InjectQueue(QUEUE_NAMES.SMS) smsQueue: Queue,
    @InjectQueue(QUEUE_NAMES.PUSH) pushQueue: Queue,
  ) {
    const connection = buildRedisConnectionOptions(this.configService);

    for (const queue of [emailQueue, smsQueue, pushQueue]) {
      const events = new QueueEvents(queue.name, { connection });

      events.on('failed', ({ jobId, failedReason }) => {
        void this.handleFailed(queue, jobId, failedReason);
      });

      events.on('completed', ({ jobId }) => {
        this.logger.log(
          `Job ${jobId} on ${queue.name} completed`,
          'NotificationQueueEvents',
        );
      });

      this.queueEvents.push(events);
    }
  }

  private async handleFailed(
    queue: Queue,
    jobId: string,
    failedReason: string,
  ) {
    const job = await queue.getJob(jobId);
    if (!job) return;

    const attemptsMade = job.attemptsMade;
    const maxAttempts = job.opts.attempts ?? 1;

    this.logger.warn(
      `Job ${jobId} on ${queue.name} failed (attempt ${attemptsMade}/${maxAttempts}): ${failedReason}`,
      'NotificationQueueEvents',
    );

    if (attemptsMade < maxAttempts) {
      return;
    }

    const data = job.data as { notificationId?: string };

    const notificationId = data.notificationId;

    if (!notificationId) return;

    await this.notificationRepository.update(
      {
        id: notificationId,
      },
      {
        status: NotificationStatus.DEAD_LETTER,
        lastError: failedReason?.slice(0, 2000) ?? null,
      },
    );

    this.logger.error(
      `Notification ${notificationId} moved to DEAD_LETTER after ${attemptsMade} attempts`,
      undefined,
      'NotificationQueueEvents',
    );
  }

  async onApplicationShutdown() {
    await Promise.all(this.queueEvents.map((events) => events.close()));
  }
}
