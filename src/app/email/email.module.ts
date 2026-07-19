import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { SmtpEmailProvider } from './providers/smtp-email-provider';
import { ResendEmailProvider } from './providers/resend-email-provider';
import { AppLogger } from '../logger/logger.service';
import { EmailService } from './email.service';
import { EMAIL_PROVIDER } from './constants';
import { TestEmailController } from './test-email.controller';

type EmailDriver = 'smtp' | 'resend';
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: EMAIL_PROVIDER,
      useFactory: (configService: ConfigService, appLogger: AppLogger) => {
        const driver = configService.getOrThrow<EmailDriver>('EMAIL_DRIVER');

        return driver === 'smtp'
          ? new SmtpEmailProvider(configService)
          : new ResendEmailProvider(configService, appLogger);
      },
      inject: [ConfigService, AppLogger],
    },
    EmailService,
  ],
  exports: [EmailService, EMAIL_PROVIDER],
  controllers: [TestEmailController],
})
export class EmailModule {}
