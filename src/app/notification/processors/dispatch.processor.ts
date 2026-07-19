import { InjectQueue, Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { DEFAULT_JOB_OPTIONS, QUEUE_NAMES } from '../constant';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Job, Queue } from 'bullmq';
import { NotificationPreferenceService } from '../services/notification-preference.service';
import { RecipentResolverService } from '../services/recipent-resolver.service';
import { NotificationRateLimiterService } from '../services/notification-rate-limiter.service';
import { AppLogger } from '../../logger/logger.service';
import {
  ChannelJobData,
  DispatchJobData,
} from '../interfaces/notification-job.interface';
import { NotificationChannel } from '../enums/notification-channel.enum';
import { Notification } from '../entities/notification.entity';
import { NotificationStatus } from '../enums/notification-status.enum';
import { NotificationPriority } from '../enums/notification-priority.enum';
import { computeQuietHoursDelayMs } from '../utils/quiet-hours';

@Injectable()
@Processor(QUEUE_NAMES.DISPATCH, { concurrency: 25 })
export class DispatchProcessor extends WorkerHost {
  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
    @InjectQueue(QUEUE_NAMES.EMAIL) private readonly emailQueue: Queue,
    @InjectQueue(QUEUE_NAMES.SMS) private readonly smsQueue: Queue,
    @InjectQueue(QUEUE_NAMES.PUSH) private readonly pushQueue: Queue,
    private readonly preferenceService: NotificationPreferenceService,
    private readonly recipientResolver: RecipentResolverService,
    private readonly rateLimiter: NotificationRateLimiterService,
    private readonly logger: AppLogger,
  ) {
    super();
  }

  async process(job: Job<DispatchJobData>): Promise<void> {
    const data = job.data;

    this.logger.log(
      `Dispatch worker picked up job ${job.id}`,
      'DispatchProcessor',
    );

    const underCap = await this.rateLimiter.consume(data.userId);
    if (!underCap) {
      this.logger.warn(
        `Daily notification cap reached for user=${data.userId}; dropping type=${data.type}`,
        'DispatchProcessor',
      );

      return;
    }

    try {
      const enabledChannels = await this.preferenceService.getEnabledChannels(
        data.userId,
      );

      const targetChannels = (data.channels ?? enabledChannels).filter((c) =>
        enabledChannels.includes(c),
      );

      if (targetChannels.length === 0) {
        this.logger.log(
          `No eligible channels for user=${data.userId} (all disabled) - skipping`,
          'DispatchProcessor',
        );
        return;
      }

      await Promise.all(
        targetChannels.map((channel) => this.dispatchToChannel(data, channel)),
      );
    } catch (err) {
      this.logger.error(
        err instanceof Error ? err.stack : String(err),
        undefined,
        'DispatchProcessor',
      );

      throw err;
    }
  }

  private async dispatchToChannel(
    data: DispatchJobData,
    channel: NotificationChannel,
  ): Promise<void> {
    const destinations = await this.recipientResolver.resolve(
      data.userId,
      channel,
    );

    const notification = await this.upsertNotificationRow(data, channel);

    if (destinations.length === 0) {
      notification.status = NotificationStatus.SKIPPED;
      notification.lastError = 'No destination on file for this channel';
      await this.notificationRepository.save(notification);
      return;
    }

    const preference = await this.preferenceService.getPreference(
      data.userId,
      channel,
    );

    const delay =
      data.priority === NotificationPriority.CRITICAL
        ? 0
        : computeQuietHoursDelayMs(
            preference?.quietHoursStart ?? null,
            preference?.quietHoursEnd ?? null,
            preference?.timezone ?? 'Africa/Lagos',
          );
    const jobData: ChannelJobData = {
      notificationId: notification.id,
      userId: data.userId,
      channel,
      type: data.type,
      title: data.title,
      body: data.body,
      html: data.html,
      data: data.data,
      ...(channel === NotificationChannel.PUSH
        ? { tokens: destinations }
        : { to: destinations[0] }),
    };

    const targetQueue = this.getQueue(channel);
    await targetQueue.add(data.type, jobData, {
      ...DEFAULT_JOB_OPTIONS,
      jobId: `${data.idempotencyKey}_${channel}`,
      priority: data.priority,
      delay,
    });

    notification.status = NotificationStatus.QUEUED;
    await this.notificationRepository.save(notification);
  }

  private async upsertNotificationRow(
    data: DispatchJobData,
    channel: NotificationChannel,
  ): Promise<Notification> {
    const existing = await this.notificationRepository.findOne({
      where: { idempotencyKey: data.idempotencyKey, channel },
    });

    if (existing) return existing;

    const created = this.notificationRepository.create({
      userId: data.userId,
      channel,
      type: data.type,
      status: NotificationStatus.PENDING,
      priority: data.priority,
      title: data.title ?? null,
      body: data.body,
      data: data.data ?? null,
      idempotencyKey: data.idempotencyKey,
    });

    try {
      return await this.notificationRepository.save(created);
    } catch (err) {
      const raced = await this.notificationRepository.findOne({
        where: {
          idempotencyKey: data.idempotencyKey,
          channel,
        },
      });

      if (raced) return raced;
      throw err;
    }
  }

  private getQueue(channel: NotificationChannel): Queue {
    switch (channel) {
      case NotificationChannel.EMAIL:
        return this.emailQueue;
      case NotificationChannel.SMS:
        return this.smsQueue;
      case NotificationChannel.PUSH:
        return this.pushQueue;
    }
  }
}
