import { Inject, Injectable } from '@nestjs/common';
import {
  ChannelSendPayload,
  ChannelSendResult,
  IChannelProvider,
} from '../../interfaces/channel-provider.interface';
import { EMAIL_PROVIDER } from '../../../email/constants';
import { IEmailProvider } from '../../../email/providers/i-email-provider.interface';

@Injectable()
export class ExistingEmailServiceAdapter implements IChannelProvider {
  readonly name = 'app-email-service';

  constructor(
    @Inject(EMAIL_PROVIDER) private readonly emailProvider: IEmailProvider,
  ) {}

  async send(payload: ChannelSendPayload): Promise<ChannelSendResult> {
    const providerMessageId = await this.emailProvider.sendEmail({
      to: payload.to,
      subject: payload.title ?? 'Notification',
      text: payload.body,
      html: payload.html,
    });

    return { providerMessageId, providerName: this.name };
  }
}
