import { Injectable } from '@nestjs/common';
import { EmailOptions, IEmailProvider } from './i-email-provider.interface';
import { Resend } from 'resend';
import { ConfigService } from '@nestjs/config';
import { AppLogger } from '../../logger/logger.service';

@Injectable()
export class ResendEmailProvider implements IEmailProvider {
  private readonly resend: Resend;
  private readonly from: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly logger: AppLogger,
  ) {
    this.resend = new Resend(
      this.configService.getOrThrow<string>('RESEND_API_KEY'),
    );
    this.from = this.configService.getOrThrow<string>('RESEND_MAIL_FROM');
  }

  async sendEmail(options: EmailOptions): Promise<string> {
    const { data, error } = await this.resend.emails.send({
      from: this.from,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
    });

    if (error) {
      this.logger.error(`Email failed to send from resend : ${error.message}`);
      throw new Error(error.message);
    }

    this.logger.log(`Email sent to ID : ${data.id}`);

    return data.id ?? '';
  }
}
