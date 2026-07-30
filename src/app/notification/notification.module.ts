import { Global, Module } from '@nestjs/common';
import { NotificationAdminController } from './controllers/notification-admin.controller';
import { NotificationController } from './controllers/notification.controller';
import { DeadLetterService } from './services/dead-letter.service';
import { DeviceTokenService } from './services/device-token.service';
import { NotificationPreferenceService } from './services/notification-preference.service';
import { NotificationProducerService } from './services/notification-producer.service';
import { NotificationRateLimiterService } from './services/notification-rate-limiter.service';
import { NotificationService } from './services/notification.service';
import { RecipentResolverService } from './services/recipent-resolver.service';
import { RedisHealthService } from './services/redis-health.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import notificationConfig from '../config/notification.config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Notification } from './entities/notification.entity';
import { NotificationPreference } from './entities/notification-preference.entity';
import { DeviceToken } from './entities/device-token.entity';
import { User } from '../domain/users/entities/user.entity';
import { EmailModule } from '../email/email.module';
import { CommonModule } from '../common/common.module';
import { BullModule } from '@nestjs/bullmq';
import {
  buildRedisConnectionOptions,
  redisConnectionProvider,
} from './redis/redis-connection.provider';
import { DEFAULT_JOB_OPTIONS, QUEUE_NAMES } from './constant';
import { SynchronousFallbackService } from './services/synchronous-fallback.service';
import { NotificationTemplateService } from './templates/template.service';
import { ChannelProviderFactory } from './providers/channel-provider.factory';
import { SmtpEmailChannelProvider } from './providers/email/smtp-email-channel.provider';
import { ExistingEmailServiceAdapter } from './providers/email/existing-email-service.adapter';
import { TermiiSmsChannelProvider } from './providers/sms/termii-sms-channel.provider';
import { TwilloSmsChannelProvider } from './providers/sms/twillo-sms-channel.provider';
import { FirebasePushChannelProvider } from './providers/push/firebase-push-channel.provider';
import { DispatchProcessor } from './processors/dispatch.processor';
import { EmailProcessor } from './processors/email.processor';
import { SmsProcessor } from './processors/sms.processor';
import { PushProcessor } from './processors/push.processor';
import { NotificationQueueEventsListener } from './listeners/notification-queue-events.listener';
import { TestNotificationService } from './services/test-notification.service';
import { NotificationBroadcastService } from './services/notification-broadcast.service';
import { RecipientBatchService } from './services/recipient-batch.service';
import { RecipientBatchNotificationService } from './services/recipient-batch-notification.service';
import { RecipientSelectionService } from './services/recipient-selection.service';
import { NotificationCleanupServiceService } from './services/notification-cleanup.service';

@Global()
@Module({
  imports: [
    ConfigModule.forFeature(notificationConfig),
    TypeOrmModule.forFeature([
      Notification,
      NotificationPreference,
      DeviceToken,
      User,
    ]),
    EmailModule,
    CommonModule,

    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        connection: buildRedisConnectionOptions(configService),
        defaultJobOptions: DEFAULT_JOB_OPTIONS,
      }),
    }),
    BullModule.registerQueue(
      { name: QUEUE_NAMES.DISPATCH },
      { name: QUEUE_NAMES.EMAIL },
      { name: QUEUE_NAMES.SMS },
      { name: QUEUE_NAMES.PUSH },
    ),
  ],
  providers: [
    redisConnectionProvider,

    NotificationService,
    NotificationProducerService,

    NotificationPreferenceService,
    DeviceTokenService,
    RecipentResolverService,
    NotificationRateLimiterService,
    RedisHealthService,
    DeadLetterService,
    SynchronousFallbackService,

    NotificationTemplateService,

    ChannelProviderFactory,
    SmtpEmailChannelProvider,
    ExistingEmailServiceAdapter,
    TermiiSmsChannelProvider,
    TwilloSmsChannelProvider,
    FirebasePushChannelProvider,

    DispatchProcessor,
    EmailProcessor,
    SmsProcessor,
    PushProcessor,
    NotificationQueueEventsListener,
    TestNotificationService,
    NotificationBroadcastService,
    RecipientBatchService,
    RecipientBatchNotificationService,
    RecipientSelectionService,
    NotificationCleanupServiceService,
  ],
  controllers: [NotificationAdminController, NotificationController],
  exports: [
    NotificationService,
    NotificationBroadcastService,
    TestNotificationService,
  ],
})
export class NotificationModule {}
