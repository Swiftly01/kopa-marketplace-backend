import { BadRequestException, Injectable } from '@nestjs/common';
import { NotificationChannel } from '../enums/notification-channel.enum';

import { ChannelProviderFactory } from '../providers/channel-provider.factory';
import { sendWithProviderFallback } from '../providers/provider-fallback.util';

import { AppLogger } from '../../logger/logger.service';
import { TestNotificationDto } from '../dtos/test-notification.dto';
import { redactDestination } from '../utils/redact';

const DEFAULT_TEST_MESSAGE =
  'This is a test message from Kopa Mart to confirm this channel is configured correctly.';

export interface TestNotificationResult {
  channel: NotificationChannel;
  to: string; // redacted
  success: boolean;
  providerName?: string;
  providerMessageId?: string;
  error?: string;
  durationMs: number;
}

@Injectable()
export class TestNotificationService {
  constructor(
    private readonly providerFactory: ChannelProviderFactory,
    private readonly logger: AppLogger,
  ) {}

  async runTest(dto: TestNotificationDto): Promise<TestNotificationResult[]> {
    if (!dto.email && !dto.phoneNumber && !dto.pushToken) {
      throw new BadRequestException(
        'Provide at least one of email, phoneNumber, or pushToken to test.',
      );
    }

    const message = dto.message ?? DEFAULT_TEST_MESSAGE;
    const results: TestNotificationResult[] = [];

    if (dto.email) {
      results.push(
        await this.testChannel(NotificationChannel.EMAIL, dto.email, message),
      );
    }
    if (dto.phoneNumber) {
      results.push(
        await this.testChannel(
          NotificationChannel.SMS,
          dto.phoneNumber,
          message,
        ),
      );
    }
    if (dto.pushToken) {
      results.push(
        await this.testChannel(
          NotificationChannel.PUSH,
          dto.pushToken,
          message,
        ),
      );
    }

    return results;
  }

  private async testChannel(
    channel: NotificationChannel,
    to: string,
    message: string,
  ): Promise<TestNotificationResult> {
    const redactedTo = redactDestination(to);
    const startedAt = Date.now();

    const providers = this.providerFactory.getProviderChain(channel);

    const { result, errors } = await sendWithProviderFallback(providers, [to], {
      title: '[Test] Kopa Mart notification check',
      body: message,
      html:
        channel === NotificationChannel.EMAIL
          ? `<p>${message}</p><p style="color:#888;font-size:12px">Triggered manually from the admin panel to verify the email channel.</p>`
          : undefined,
    });

    const durationMs = Date.now() - startedAt;

    if (!result) {
      const combinedError = errors.join(' | ');
      this.logger.warn(
        `Test notification FAILED channel=${channel} to=${redactedTo}: ${combinedError}`,
        'TestNotificationService',
      );
      return {
        channel,
        to: redactedTo,
        success: false,
        error: combinedError,
        durationMs,
      };
    }

    this.logger.log(
      `Test notification sent channel=${channel} to=${redactedTo} via=${result.providerName} (${durationMs}ms)`,
      'TestNotificationService',
    );

    return {
      channel,
      to: redactedTo,
      success: true,
      providerName: result.providerName,
      providerMessageId: result.providerMessageId,
      durationMs,
    };
  }
}
