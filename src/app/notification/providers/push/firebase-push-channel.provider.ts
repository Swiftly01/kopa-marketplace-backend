import { Injectable } from '@nestjs/common';
import {
  ChannelSendPayload,
  ChannelSendResult,
  IChannelProvider,
} from '../../interfaces/channel-provider.interface';
import { ConfigService } from '@nestjs/config';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';
import { AppLogger } from '../../../logger/logger.service';

@Injectable()
export class FirebasePushChannelProvider implements IChannelProvider {
  readonly name = 'fcm';
  private initilized = false;

  constructor(
    private readonly configService: ConfigService,
    private readonly logger: AppLogger,
  ) {}

  private ensureInitialized(): void {
    if (this.initilized || getApps().length > 0) {
      this.initilized = true;
      return;
    }

    const projectId = this.configService.get<string>(
      'notificationConfig.push.firebase.projectId',
    );
    const clientEmail = this.configService.get<string>(
      'notificationConfig.push.firebase.clientEmail',
    );
    const privateKey = this.configService
      .get<string>('notificationConfig.push.firebase.privateKey')
      ?.replace(/\\n/g, '\n');

    if (!projectId || !clientEmail || !privateKey) {
      throw new Error(
        'Push provider is not configured (FIREBASE_PROJECT_ID/FIREBASE_CLIENT_EMAIL/FIREBASE_PRIVATE_KEY)',
      );
    }

    initializeApp({
      credential: cert({ projectId, clientEmail, privateKey }),
    });

    this.initilized = true;
  }

  // async send(payload: ChannelSendPayload): Promise<ChannelSendResult> {
  //   this.ensureInitialized();

  //   const defaultUrl = this.configService.get<string>(
  //     'notificationConfig.push.defaultUrl',
  //   );

  //   const defaultImageUrl = this.configService.get<string>(
  //     'notificationConfig.push.defaultImage',
  //   );

  //   const url = payload.url ?? defaultUrl;
  //   const imageUrl = payload.image ?? defaultImageUrl;

  //   const messageId = await getMessaging().send({
  //     token: payload.to,
  //     notification: {
  //       title: payload.title,
  //       body: payload.body,
  //       imageUrl: payload.image,
  //     },
  //     data: this.stringifyValues({
  //       ...payload.data,
  //       url,
  //       image: imageUrl,
  //     }),
  //     webpush: {
  //       notification: {
  //         image: imageUrl,
  //       },
  //       fcmOptions: {
  //         link: url,
  //       },
  //     },
  //   });

  //   return {
  //     providerMessageId: messageId,
  //     providerName: this.name,
  //   };
  // }

  async send(payload: ChannelSendPayload): Promise<ChannelSendResult> {
    this.ensureInitialized();

    const defaultUrl = this.configService.get<string>(
      'notificationConfig.push.defaultUrl',
    );
    const defaultImageUrl = this.configService.get<string>(
      'notificationConfig.push.defaultImage',
    );
    const defaultIcon = this.configService.get<string>(
      'notificationConfig.push.defaultIcon',
    );
    const defaultBadge = this.configService.get<string>(
      'notificationConfig.push.defaultBadge',
    );

    const url = payload.url ?? defaultUrl;
    const imageUrl = payload.image ?? defaultImageUrl;
    const icon = payload.icon ?? defaultIcon;
    const badge = payload.badge ?? defaultBadge;

    try {
      const messageId = await getMessaging().send({
        token: payload.to,

        data: this.stringifyValues({
          ...payload.data,
          title: payload.title,
          body: payload.body,
          url,
          image: imageUrl,
          icon,
          badge,
        }),
        webpush: {
          fcmOptions: {
            link: url,
          },
        },
      });

      return {
        providerMessageId: messageId,
        providerName: this.name,
      };
    } catch (err: any) {
      const errMsg = err instanceof Error ? err.message : String(err);
      const stack = err instanceof Error ? err.stack : undefined;
      const code = this.getErrorCode(err);

      const isDeadToken =
        code === 'messaging/registration-token-not-registered' ||
        code === 'messaging/invalid-registration-token';

      if (isDeadToken) {
        this.logger?.warn?.(`Stale FCM token, not retrying: ${payload.to}`);

        return {
          providerMessageId: '',
          providerName: this.name,
        };
      }

      this.logger?.error?.(`FCM send failed: ${errMsg}`, stack);
      throw err; // transient error — let BullMQ retry
    }
  }

  private stringifyValues(
    data?: Record<string, unknown>,
  ): Record<string, string> | undefined {
    if (!data) return undefined;
    return Object.fromEntries(
      Object.entries(data).map(([key, value]) => [key, String(value)]),
    );
  }

  getErrorCode(err: unknown): string | undefined {
    if (
      typeof err === 'object' &&
      err !== null &&
      'code' in err &&
      typeof err.code === 'string'
    ) {
      return (err as { code: string }).code;
    }
    return undefined;
  }
}
