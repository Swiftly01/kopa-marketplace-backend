import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SmtpEmailChannelProvider } from './email/smtp-email-channel.provider';
import { ExistingEmailServiceAdapter } from './email/existing-email-service.adapter';
import { TermiiSmsChannelProvider } from './sms/termii-sms-channel.provider';
import { TwilloSmsChannelProvider } from './sms/twillo-sms-channel.provider';
import { FirebasePushChannelProvider } from './push/firebase-push-channel.provider';
import { IChannelProvider } from '../interfaces/channel-provider.interface';
import { NotificationChannel } from '../enums/notification-channel.enum';

@Injectable()
export class ChannelProviderFactory {
  constructor(
    private readonly configService: ConfigService,
    private readonly smtpEmailProvider: SmtpEmailChannelProvider,
    private readonly existingEmailServiceAdapter: ExistingEmailServiceAdapter,
    private readonly termiiSmsProvider: TermiiSmsChannelProvider,
    private readonly twilloSmsProvider: TwilloSmsChannelProvider,
    private readonly firebasePushProvider: FirebasePushChannelProvider,
  ) {}

  getProviderChain(channel: NotificationChannel): IChannelProvider[] {
    switch (channel) {
      case NotificationChannel.EMAIL:
        return this.orderByPrimary(
          this.configService.get('notificationConfig.email.driver', 'smtp'),
          [
            ['smtp', this.smtpEmailProvider],
            ['app-email-service', this.existingEmailServiceAdapter],
          ],
        );
      case NotificationChannel.SMS:
        return this.orderByPrimary(
          this.configService.get('notificationConfig.sms.driver', 'termii'),
          [
            ['termii', this.termiiSmsProvider],
            ['twillo', this.twilloSmsProvider],
          ],
        );
      case NotificationChannel.PUSH:
        return [this.firebasePushProvider];
    }
  }

  private orderByPrimary(
    primaryName: string,
    candidates: [string, IChannelProvider][],
  ): IChannelProvider[] {
    const providers: IChannelProvider[] = [];

    for (const [name, provider] of candidates) {
      if (name === primaryName) {
        providers.unshift(provider);
      } else {
        providers.push(provider);
      }
    }

    return providers;
  }
}
