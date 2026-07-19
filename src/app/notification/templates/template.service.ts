import { Injectable } from '@nestjs/common';
import { NotificationType } from '../enums/notification-type.enum';
import { NotificationChannel } from '../enums/notification-channel.enum';

export interface RenderedTemplate {
  title?: string;
  body: string;
  html?: string;
}

type TemplateFn = (
  data: Record<string, unknown>,
  fallback: {
    title?: string;
    body: string;
  },
) => RenderedTemplate;

@Injectable()
export class NotificationTemplateService {
  private readonly emailTemplates: Partial<
    Record<NotificationType, TemplateFn>
  > = {
    [NotificationType.OTP_VERIFICATION]: (data) => ({
      title: 'Your Kopa Mart verification code',
      body: `Your code is ${String(data.otp)}. It expires in 10 minutes.`,
      html: `<p>Your verification code is <strong style="font-size:24px;letter-spacing:2px">${String(data.otp)}</strong>.</p><p>This code expires in 10 minutes. If you didn't request it, you can ignore this email.</p>`,
    }),
    [NotificationType.ORDER_STATUS_UPDATE]: (data) => ({
      title: `Order #${String(data.orderId)} update`,
      body: `Your order is now ${String(data.status)}.`,
      html: `<p>Your order <strong>#${String(data.orderId)}</strong> is now <strong>${String(data.status)}</strong>.</p>`,
    }),
  };

  private readonly smsTemplates: Partial<Record<NotificationType, TemplateFn>> =
    {
      [NotificationType.OTP_VERIFICATION]: (data) => ({
        body: `Kopa Mart code: ${String(data.otp)}. Expires in 10 min. Do not share this code.`,
      }),
      [NotificationType.ORDER_STATUS_UPDATE]: (data) => ({
        body: `Kopa Mart: Order #${String(data.orderId)} is now ${String(data.status)}.`,
      }),
    };

  private readonly pushTemplates: Partial<
    Record<NotificationType, TemplateFn>
  > = {
    [NotificationType.ORDER_STATUS_UPDATE]: (data) => ({
      title: 'Order update',
      body: `Order #${String(data.orderId)} is now ${String(data.status)}.`,
    }),
    [NotificationType.PRICE_DROP_ALERT]: (data) => ({
      title: 'Price drop!',
      body: `${String(data.productName)} just dropped to ${String(data.newPrice)}.`,
    }),
  };

  render(
    channel: NotificationChannel,
    type: NotificationType,
    fallback: { title?: string; body: string },
    data: Record<string, unknown> = {},
  ): RenderedTemplate {
    const table =
      channel === NotificationChannel.EMAIL
        ? this.emailTemplates
        : channel === NotificationChannel.SMS
          ? this.smsTemplates
          : this.pushTemplates;

    const templateFn = table[type];

    if (!templateFn) {
      return { title: fallback.title, body: fallback.body };
    }

    return templateFn(data, fallback);
  }
}
