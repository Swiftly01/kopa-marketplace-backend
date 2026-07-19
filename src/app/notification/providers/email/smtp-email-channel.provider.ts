import type { Transporter } from 'nodemailer';
import {
  ChannelSendPayload,
  ChannelSendResult,
  IChannelProvider,
} from '../../interfaces/channel-provider.interface';
import * as nodemailer from 'nodemailer';
import { ConfigService } from '@nestjs/config';
import type SMTPTransport from 'nodemailer/lib/smtp-transport';

export class SmtpEmailChannelProvider implements IChannelProvider {
  readonly name = 'smtp';
  private transporter: Transporter | null = null;

  constructor(private readonly configService: ConfigService) {}

  private getTransporter(): Transporter {
    if (this.transporter) return this.transporter;

    const host = this.configService.get<string>('MAIL_HOST');
    const port = this.configService.get<string>('MAIL_PORT');
    const user = this.configService.get<string>('MAIL_USER');
    const pass = this.configService.get<string>('MAIL_PASSWORD');

    if (!host || !port || !user || !pass) {
      throw new Error(
        'SMTP provider is not configured (MAIL_HOST/MAIL_PORT/MAIL_USER/MAIL_PASSWORD)',
      );
    }

    this.transporter = nodemailer.createTransport({
      host,
      port: Number(port),
      secure: Number(port) === 465,
      auth: { user, pass },
    });

    return this.transporter;
  }

  async send(payload: ChannelSendPayload): Promise<ChannelSendResult> {
    const from = this.configService.get<string>(
      'MAIL_FROM',
      'no-reply@kopamarketplace.com',
    );

    const result = (await this.getTransporter().sendMail({
      from,
      to: payload.to,
      subject: payload.title ?? 'Notification',
      text: payload.body,
      html: payload.html,
    })) as SMTPTransport.SentMessageInfo;

    const messageId = (result as { messaageId?: string })?.messaageId;

    if (!messageId) throw new Error('SMTP provider returned no messageId');
    return {
      providerMessageId: messageId,
      providerName: this.name,
    };
  }
}
