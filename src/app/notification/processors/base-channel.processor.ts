import { Repository } from 'typeorm';
import { NotificationChannel } from '../enums/notification-channel.enum';
import { Notification } from '../entities/notification.entity';
import { NotificationTemplateService } from '../templates/template.service';
import { AppLogger } from '../../logger/logger.service';
import { WorkerHost } from '@nestjs/bullmq';
import { IChannelProvider } from '../interfaces/channel-provider.interface';
import { Job } from 'bullmq';
import { ChannelJobData } from '../interfaces/notification-job.interface';
import { NotificationStatus } from '../enums/notification-status.enum';
import { sendWithProviderFallback } from '../providers/provider-fallback.util';

export abstract class BaseChannelProcessor extends WorkerHost {
  protected abstract readonly channel: NotificationChannel;

  protected constructor(
    protected readonly notificationRepository: Repository<Notification>,
    protected readonly templateService: NotificationTemplateService,
    protected readonly logger: AppLogger,
  ) {
    super();
  }

  protected abstract getProviderChain(): IChannelProvider[];
  protected abstract buildRecipents(job: Job<ChannelJobData>): string[];

  async process(job: Job<ChannelJobData>): Promise<void> {
    const data = job.data;
    const rendered = this.templateService.render(this.channel, data.type, {
      title: data.title,
      body: data.body,
    });

    const recipents = this.buildRecipents(job);
    const providers = this.getProviderChain();

    await this.markProcessing(data.notificationId, job.attemptsMade);

    const { result, errors } = await sendWithProviderFallback(
      providers,
      recipents,
      {
        title: rendered.title,
        body: rendered.body,
        html: data.html ?? rendered.html,
        data: data.data,
      },
    );

    if (errors.length > 0) {
      for (const message of errors) {
        this.logger.warn(
          `Provider failed for notification=${data.notificationId}: ${message}`,
          `${this.constructor.name}`,
        );
      }
    }

    if (!result) {
      const combinedError = errors.join(' | ');
      await this.markFailedAttempt(data.notificationId, combinedError);

      throw new Error(combinedError);
    }
  }

  protected async markProcessing(notificationId: string, attemptsMade: number) {
    await this.notificationRepository.update(
      { id: notificationId },
      {
        status: NotificationStatus.PROCESSING,
        attempts: attemptsMade + 1,
      },
    );
  }

  protected async markSent(
    notificationId: string,
    result: { providerMessageId: string; providerName: string },
  ) {
    await this.notificationRepository.update(
      { id: notificationId },
      {
        status: NotificationStatus.SENT,
        providerMessageId: result.providerMessageId,
        providerName: result.providerName,
        sentAt: new Date(),
        lastError: null,
      },
    );
  }

  protected async markFailedAttempt(notificationId: string, error: string) {
    await this.notificationRepository.update(
      { id: notificationId },
      { lastError: error.slice(0, 2000) },
    );
  }
}
