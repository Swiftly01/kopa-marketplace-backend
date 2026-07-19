import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AppLogger } from '../../logger/logger.service';
import { SendNotificationDto } from '../dtos/send-notification.dto';
import { Notification } from '../entities/notification.entity';
import { NotificationChannel } from '../enums/notification-channel.enum';
import { NotificationPriority } from '../enums/notification-priority.enum';
import { NotificationStatus } from '../enums/notification-status.enum';
import { ChannelProviderFactory } from '../providers/channel-provider.factory';
import { NotificationTemplateService } from '../templates/template.service';
import { deriveIdempotencyKey } from '../utils/idempotency';
import { DeviceTokenService } from './device-token.service';
import { NotificationPreferenceService } from './notification-preference.service';
import { RecipentResolverService } from './recipent-resolver.service';
import { sendWithProviderFallback } from '../providers/provider-fallback.util';

export interface SyncChannelOutcome {
  channel: NotificationChannel;
  status:
    | NotificationStatus.SENT
    | NotificationStatus.FAILED
    | NotificationStatus.SKIPPED;
  error?: string;
}

export interface SyncSendResult {
  mode: 'sync-fallback';
  notificationRequestId: string;
  channels: SyncChannelOutcome[];
}

@Injectable()
export class SynchronousFallbackService {
  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
    private readonly preferenceService: NotificationPreferenceService,
    private readonly recipientResolver: RecipentResolverService,
    private readonly deviceTokenService: DeviceTokenService,
    private readonly templateService: NotificationTemplateService,
    private readonly providerFactory: ChannelProviderFactory,
    private readonly logger: AppLogger,
  ) {}

  async sendNow(dto: SendNotificationDto, notificationRequestId: string) {
    this.logger.warn(
      `Redis unavailable - sending synchronously for user=${dto.userId}`,
      'SynchronousFallbackService',
    );

    const idempotencyKey =
      dto.idempotencyKey ??
      deriveIdempotencyKey({
        userId: dto.userId,
        type: dto.type,
        body: dto.body,
        data: dto.data,
      });

    const priority = dto.priority ?? NotificationPriority.NORMAL;

    const enabledChannels = await this.preferenceService.getEnabledChannels(
      dto.userId,
    );

    const targetChannels = (dto.channels ?? enabledChannels).filter((c) =>
      enabledChannels.includes(c),
    );

    const outcomes: SyncChannelOutcome[] = [];

    for (const channel of targetChannels) {
      const outcome = await this.sendToChannel(
        dto,
        channel,
        priority,
        idempotencyKey,
      );

      outcomes.push(outcome);
    }

    return {
      mode: 'sync-fallback' as const,
      notificationRequestId,
      channels: outcomes,
    };
  }

  private async sendToChannel(
    dto: SendNotificationDto,
    channel: NotificationChannel,
    priority: NotificationPriority,
    idempotencyKey: string,
  ): Promise<SyncChannelOutcome> {
    const existing = await this.notificationRepository.findOne({
      where: {
        idempotencyKey,
        channel,
      },
    });

    if (existing) {
      return {
        channel,
        status: existing.status as SyncChannelOutcome['status'],
      };
    }

    const destinations = await this.recipientResolver.resolve(
      dto.userId,
      channel,
    );

    if (destinations.length === 0) {
      await this.persist({
        dto,
        channel,
        priority,
        idempotencyKey,
        status: NotificationStatus.SKIPPED,
        error: 'No destination on file for this channel',
      });

      return {
        channel,
        status: NotificationStatus.SKIPPED,
      };
    }

    const rendered = this.templateService.render(
      channel,
      dto.type,
      { title: dto.title, body: dto.body },
      dto.data,
    );

    if (channel === NotificationChannel.PUSH) {
      return this.sendPush(
        dto,
        destinations,
        rendered,
        priority,
        idempotencyKey,
      );
    }

    const providers = this.providerFactory.getProviderChain(channel);
    const { result, errors } = await sendWithProviderFallback(
      providers,
      destinations,
      {
        title: rendered.title,
        body: rendered.body,
        html: dto.html ?? rendered.html,
        data: dto.data,
      },
    );

    if (!result) {
      const combinedError = errors.join(' | ');
      this.logger.error(
        `Synchronous send failed for user=${dto.userId} channel=${channel}`,
        undefined,
        'SynchronousFallbackService',
      );

      await this.persist({
        dto,
        channel,
        priority,
        idempotencyKey,
        status: NotificationStatus.FAILED,
        error: combinedError,
      });
      return {
        channel,
        status: NotificationStatus.FAILED,
        error: combinedError,
      };
    }

    await this.persist({
      dto,
      channel,
      priority,
      idempotencyKey,
      status: NotificationStatus.SENT,
      providerMessageId: result.providerMessageId,
      providerName: result.providerName,
    });

    return { channel, status: NotificationStatus.SENT };
  }

  private async sendPush(
    dto: SendNotificationDto,
    tokens: string[],
    rendered: { title?: string; body: string },
    priority: NotificationPriority,
    idempotencyKey: string,
  ): Promise<SyncChannelOutcome> {
    const [provider] = this.providerFactory.getProviderChain(
      NotificationChannel.PUSH,
    );

    const results = await Promise.allSettled(
      tokens.map((token) =>
        provider.send({
          to: token,
          title: rendered.title,
          body: rendered.body,
          data: dto.data,
        }),
      ),
    );

    const succeeded = results.find(
      (
        r,
      ): r is PromiseFulfilledResult<{
        providerMessageId: string;
        providerName: string;
      }> => r.status === 'fulfilled',
    );

    await this.deactivateInvalidTokens(tokens, results);

    if (!succeeded) {
      const combinedError = results
        .filter((r): r is PromiseRejectedResult => r.status === 'rejected')
        .map((r) => String(r.reason))
        .join(' | ');

      await this.persist({
        dto,
        channel: NotificationChannel.PUSH,
        priority,
        idempotencyKey,
        status: NotificationStatus.FAILED,
        error: combinedError,
      });

      return {
        channel: NotificationChannel.PUSH,
        status: NotificationStatus.FAILED,
        error: combinedError,
      };
    }

    await this.persist({
      dto,
      channel: NotificationChannel.PUSH,
      priority,
      idempotencyKey,
      status: NotificationStatus.SENT,
      providerMessageId: succeeded.value.providerMessageId,
      providerName: succeeded.value.providerName,
    });

    return {
      channel: NotificationChannel.PUSH,
      status: NotificationStatus.SENT,
    };
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
          `Deactivating dead push token during synchronous send (token ending ...${tokens[index].slice(-6)})`,
          'SynchronousFallbackService',
        );

        return this.deviceTokenService.deactivate(tokens[index]);
      }),
    );
  }

  private async persist(args: {
    dto: SendNotificationDto;
    channel: NotificationChannel;
    priority: NotificationPriority;
    idempotencyKey: string;
    status: NotificationStatus;
    error?: string;
    providerMessageId?: string;
    providerName?: string;
  }): Promise<void> {
    const {
      dto,
      channel,
      priority,
      idempotencyKey,
      status,
      error,
      providerMessageId,
      providerName,
    } = args;

    try {
      await this.notificationRepository.save(
        this.notificationRepository.create({
          userId: dto.userId,
          channel,
          type: dto.type,
          status,
          priority,
          title: dto.title ?? null,
          body: dto.body,
          data: dto.data ?? null,
          idempotencyKey,
          lastError: error ?? null,
          providerMessageId: providerMessageId ?? null,
          providerName: providerName ?? null,
          sentAt: status === NotificationStatus.SENT ? new Date() : null,
          attempts: 1,
        }),
      );
    } catch (err) {
      this.logger.warn(
        `Could not persist synchronous notification audit row (likely a duplicate key race): ${
          err instanceof Error ? err.message : String(err)
        }`,
        'SynchronousFallbackService',
      );
    }
  }
}
