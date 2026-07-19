import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { DEFAULT_JOB_OPTIONS, QUEUE_NAMES } from '../constant';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RecipentResolverService } from './recipent-resolver.service';
import { NotificationStatus } from '../enums/notification-status.enum';
import { Notification } from '../entities/notification.entity';
import { NotificationChannel } from '../enums/notification-channel.enum';
import { ChannelJobData } from '../interfaces/notification-job.interface';

@Injectable()
export class DeadLetterService {
  constructor(
    @InjectQueue(QUEUE_NAMES.EMAIL) private readonly emailQueue: Queue,
    @InjectQueue(QUEUE_NAMES.SMS) private readonly smsQueue: Queue,
    @InjectQueue(QUEUE_NAMES.PUSH) private readonly pushQueue: Queue,
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
    private readonly recipientResolver: RecipentResolverService,
  ) {}

  async list(limit = 50): Promise<Notification[]> {
    return this.notificationRepository.find({
      where: { status: NotificationStatus.DEAD_LETTER },
      order: { updatedAt: 'DESC' },
      take: limit,
    });
  }

  async retry(notificationId: string): Promise<void> {
    const notification = await this.notificationRepository.findOne({
      where: { id: notificationId },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    const destinations = await this.recipientResolver.resolve(
      notification.userId,
      notification.channel,
    );

    if (destinations.length === 0) {
      throw new Error(
        `Cannot retry notification ${notification.id}: user has no active destination for channel ${notification.channel}`,
      );
    }

    const jobData: ChannelJobData = {
      notificationId: notification.id,
      userId: notification.userId,
      channel: notification.channel,
      type: notification.type,
      ...(notification.channel === NotificationChannel.PUSH
        ? { tokens: destinations }
        : { to: destinations[0] }),
      title: notification.title ?? undefined,
      body: notification.body ?? '',
      data: notification.data ?? undefined,
    };

    const targetQueue = this.resolveQueue(notification.channel);

    await targetQueue.add('retry', jobData, {
      ...DEFAULT_JOB_OPTIONS,
      jobId: `retry:${notification.id}:${Date.now()}`,
    });

    notification.status = NotificationStatus.QUEUED;
    notification.attempts = 0;
    notification.lastError = null;
    await this.notificationRepository.save(notification);
  }

  private resolveQueue(channel: NotificationChannel): Queue {
    switch (channel) {
      case NotificationChannel.EMAIL:
        return this.emailQueue;
      case NotificationChannel.SMS:
        return this.smsQueue;
      case NotificationChannel.PUSH:
        return this.pushQueue;
      default:
        throw new Error(`Unsupported channel: ${String(channel)}`);
    }
  }
}
