import { Injectable } from '@nestjs/common';
import {
  ChannelSendPayload,
  ChannelSendResult,
  IChannelProvider,
} from '../../interfaces/channel-provider.interface';
import { ConfigService } from '@nestjs/config';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';

@Injectable()
export class FirebasePushChannelProvider implements IChannelProvider {
  readonly name = 'fcm';
  private initilized = false;

  constructor(private readonly configService: ConfigService) {}

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

  async send(payload: ChannelSendPayload): Promise<ChannelSendResult> {
    this.ensureInitialized();

    const messageId = await getMessaging().send({
      token: payload.to,
      notification: {
        title: payload.title,
        body: payload.body,
      },
      data: this.stringifyValues(payload.data),
    });

    return {
      providerMessageId: messageId,
      providerName: this.name,
    };
  }

  private stringifyValues(
    data?: Record<string, unknown>,
  ): Record<string, string> | undefined {
    if (!data) return undefined;
    return Object.fromEntries(
      Object.entries(data).map(([key, value]) => [key, String(value)]),
    );
  }
}
