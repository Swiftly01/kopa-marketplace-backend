import { Processor } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import {
  CHANNEL_CONCURRENCY,
  CHANNEL_RATE_LIMITS,
  QUEUE_NAMES,
} from '../constant';
import { BaseChannelProcessor } from './base-channel.processor';
import { NotificationChannel } from '../enums/notification-channel.enum';
import { InjectRepository } from '@nestjs/typeorm';
import { Notification } from '../entities/notification.entity';
import { Repository } from 'typeorm';
import { NotificationTemplateService } from '../templates/template.service';
import { AppLogger } from '../../logger/logger.service';
import { ChannelProviderFactory } from '../providers/channel-provider.factory';
import { IChannelProvider } from '../interfaces/channel-provider.interface';
import { ChannelJobData } from '../interfaces/notification-job.interface';
import { Job } from 'bullmq';

@Injectable()
@Processor(QUEUE_NAMES.EMAIL, {
  concurrency: CHANNEL_CONCURRENCY.EMAIL,
  limiter: CHANNEL_RATE_LIMITS.EMAIL,
})
export class EmailProcessor extends BaseChannelProcessor {
  protected readonly channel = NotificationChannel.EMAIL;

  constructor(
    @InjectRepository(Notification)
    notificationRepository: Repository<Notification>,
    templateService: NotificationTemplateService,
    logger: AppLogger,
    private readonly providerFactory: ChannelProviderFactory,
  ) {
    super(notificationRepository, templateService, logger);
  }

  protected getProviderChain(): IChannelProvider[] {
    return this.providerFactory.getProviderChain(NotificationChannel.EMAIL);
  }

  protected buildRecipents(job: Job<ChannelJobData>): string[] {
    const { to } = job.data;
    return to ? [to] : [];
  }
}
