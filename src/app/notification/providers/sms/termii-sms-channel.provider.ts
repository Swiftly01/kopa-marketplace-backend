import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppLogger } from '../../../logger/logger.service';
import {
  ChannelSendPayload,
  ChannelSendResult,
  IChannelProvider,
} from '../../interfaces/channel-provider.interface';

@Injectable()
export class TermiiSmsChannelProvider implements IChannelProvider {
  readonly name = 'termii';

  constructor(
    private readonly configService: ConfigService,
    private readonly logger: AppLogger,
  ) {}

  async send(payload: ChannelSendPayload): Promise<ChannelSendResult> {
    const apiKey = this.configService.get<string>(
      'notificationConfig.sms.termii.apiKey',
    );

    if (!apiKey) {
      throw new Error('Termii provider is not configured (TERMII_API_KEY)');
    }

    const senderId = this.configService.get<string>(
      'notificationConfig.sms.termii.senderId',
      'KopaMart',
    );
    const baseUrl = this.configService.get<string>(
      'notificationConfig.sms.termii.baseUrl',
      'https://api.ng.termii.com',
    );

    const response = await fetch(`${baseUrl}/api/sms/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: payload.to,
        from: senderId,
        sms: payload.body,
        type: 'plain',
        channel: 'generic',
        api_key: apiKey,
      }),
    });

    const result = (await response.json()) as {
      message_id?: string;
      message?: string;
      code?: string;
    };

    if (!response.ok || !result.message_id) {
      this.logger.error(
        `Termii SMS failed: ${result.message ?? response.statusText}`,
      );

      throw new Error(result.message ?? 'Termii SMS send failed');
    }

    return {
      providerMessageId: result.message_id,
      providerName: this.name,
    };
  }
}
