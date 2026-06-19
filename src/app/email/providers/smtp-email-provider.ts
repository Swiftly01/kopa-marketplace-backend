import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Transporter } from 'nodemailer';
import * as nodemailer from 'nodemailer';
import { EmailOptions, IEmailProvider } from './i-email-provider.interface';

@Injectable()
export class SmtpEmailProvider implements IEmailProvider, OnModuleInit {
  private transporter!: Transporter;
  private readonly from: string;

  constructor(private readonly configService: ConfigService) {
    this.from = this.configService.getOrThrow<string>('MAIL_FROM');
  }

  onModuleInit() {
    const host = this.configService.getOrThrow<string>('MAIL_HOST');
    const port = Number(this.configService.getOrThrow<string>('MAIL_PORT'));
    const user = this.configService.getOrThrow<string>('MAIL_USER');
    const pass = this.configService.getOrThrow<string>('MAIL_PASSWORD');

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });
  }

  async sendEmail(options: EmailOptions): Promise<string> {
    // eslint-disable-next-line
    const result = await this.transporter.sendMail({
      from: this.from,
      ...options,
    });

    //  console.dir(result, { depth: null });

    const messageId = (result as { messageId?: string })?.messageId;

    if (!messageId) {
      throw new Error('Invalid mail response');
    }

    return messageId;
  }
}
