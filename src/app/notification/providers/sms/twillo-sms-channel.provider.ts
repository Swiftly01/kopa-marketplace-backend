import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ChannelSendPayload,
  ChannelSendResult,
  IChannelProvider,
} from '../../interfaces/channel-provider.interface';

@Injectable()
export class TwilloSmsChannelProvider implements IChannelProvider {
  readonly name = 'twillo';

  constructor(private readonly configService: ConfigService) {}

  async send(payload: ChannelSendPayload): Promise<ChannelSendResult> {
    const accountSid = this.configService.get<string>(
      'notificationConfig.sms.twilio.accountSid',
    );
    const authToken = this.configService.get<string>(
      'notificationConfig.sms.twilio.authToken',
    );
    const fromNumber = this.configService.get<string>(
      'notificationConfig.sms.twilio.fromNumber',
    );

    if (!accountSid || !authToken || !fromNumber) {
      throw new Error(
        'Twilio provider is not configured (TWILIO_ACCOUNT_SID/TWILIO_AUTH_TOKEN/TWILIO_FROM_NUMBER)',
      );
    }

    const basicAuth = Buffer.from(`${accountSid}: ${authToken}`).toString(
      'base64',
    );

    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: 'POST',
        headers: {
          Authorization: `Basic ${basicAuth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          To: payload.to,
          From: fromNumber,
          Body: payload.body,
        }),
      },
    );

    const result = (await response.json()) as {
      sid?: string;
      message?: string;
    };

    if (!response.ok || !result.sid) {
      throw new Error(result.message ?? 'Twillo SMS send failed');
    }

    return { providerMessageId: result.sid, providerName: this.name };
  }
}
