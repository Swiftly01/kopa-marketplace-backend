import { Processor } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Job } from 'bullmq';
import { Repository } from 'typeorm';
import { AppLogger } from '../../logger/logger.service';
import {
  CHANNEL_CONCURRENCY,
  CHANNEL_RATE_LIMITS,
  QUEUE_NAMES,
} from '../constant';
import { Notification } from '../entities/notification.entity';
import { NotificationChannel } from '../enums/notification-channel.enum';
import { IChannelProvider } from '../interfaces/channel-provider.interface';
import { ChannelJobData } from '../interfaces/notification-job.interface';
import { ChannelProviderFactory } from '../providers/channel-provider.factory';
import { DeviceTokenService } from '../services/device-token.service';
import { BaseChannelProcessor } from './base-channel.processor';
import { NotificationTemplateService } from '../templates/template.service';

@Injectable()
@Processor(QUEUE_NAMES.PUSH, {
  concurrency: CHANNEL_CONCURRENCY.PUSH,
  limiter: CHANNEL_RATE_LIMITS.PUSH,
})
export class PushProcessor extends BaseChannelProcessor {
  protected readonly channel = NotificationChannel.PUSH;

  constructor(
    @InjectRepository(Notification)
    notificationRepository: Repository<Notification>,
    templateService: NotificationTemplateService,
    logger: AppLogger,
    private readonly providerFactory: ChannelProviderFactory,
    private readonly deviceTokenService: DeviceTokenService,
  ) {
    super(notificationRepository, templateService, logger);
  }

  protected getProviderChain(): IChannelProvider[] {
    return this.providerFactory.getProviderChain(NotificationChannel.PUSH);
  }
  protected buildRecipents(): string[] {
    return [];
  }
  async process(job: Job<ChannelJobData>): Promise<void> {
    const data = job.data;
    const tokens = data.tokens ?? [];
    const rendered = this.templateService.render(
      this.channel,
      data.type,
      { title: data.title, body: data.body },
      data.data,
    );
    const [provider] = this.getProviderChain();

    await this.markProcessing(data.notificationId, job.attemptsMade);

    const results = await Promise.allSettled(
      tokens.map((token) =>
        provider.send({
          to: token,
          title: rendered.title,
          body: rendered.body,
          data: data.data,
        }),
      ),
    );

    const succeeded = results.filter(
      (
        r,
      ): r is PromiseFulfilledResult<{
        providerMessageId: string;
        providerName: string;
      }> => r.status === 'fulfilled',
    );

    await this.deactivateInvalidTokens(tokens, results);

    if (succeeded.length === 0) {
      const errors = results
        .filter((r): r is PromiseRejectedResult => r.status === 'rejected')
        .map((r) => String(r.reason))
        .join(' | ');
      await this.markFailedAttempt(data.notificationId, errors);
      throw new Error(errors || 'All push tokens failed');
    }

    await this.markSent(data.notificationId, succeeded[0].value);
  }

  private async deactivateInvalidTokens(
    tokens: string[],
    results: PromiseSettledResult<unknown>[],
  ): Promise<void> {
    const invalidTokenErrors = [
      'registration-token-not-registered',
      'invalid-registration-token',
    ];

    await Promise.all(
      results.map((result, index) => {
        if (result.status !== 'rejected') return Promise.resolve();
        const message = String(result.reason);
        const isInvalid = invalidTokenErrors.some((code) =>
          message.includes(code),
        );
        if (!isInvalid) return Promise.resolve();

        this.logger.log(
          `Deactivating dead push token (token ending ...${tokens[index].slice(-6)})`,
          'PushProcessor',
        );
        return this.deviceTokenService.deactivate(tokens[index]);
      }),
    );
  }
}
