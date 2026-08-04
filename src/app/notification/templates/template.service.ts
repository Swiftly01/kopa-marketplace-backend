import { Injectable } from '@nestjs/common';
import { NotificationType } from '../enums/notification-type.enum';
import { NotificationChannel } from '../enums/notification-channel.enum';

export interface RenderedTemplate {
  title?: string;
  body: string;
  html?: string;
}

export interface NewProductListingEmailData {
  productName: string;
  priceDisplay: string;
  originalPriceDisplay?: string;
  categoryName: string;
  conditionLabel: string;
  locationLabel: string;
  storeName: string;
  shortDescription: string;
  mainImageUrl: string;
  thumbnailUrls?: string[]; // up to 3, optional
  productUrl: string;
  marketplaceLogoUrl?: string;
  contactEmail?: string;
  unsubscribeUrl: string;
  preferencesUrl: string;
  facebookUrl?: string;
  instagramUrl?: string;
  twitterUrl?: string;
  whatsappUrl?: string;
}

const SOCIAL_ICON = {
  facebook: 'https://cdn-icons-png.flaticon.com/64/733/733547.png',
  instagram: 'https://cdn-icons-png.flaticon.com/64/2111/2111463.png',
  twitter: 'https://cdn-icons-png.flaticon.com/64/733/733579.png',
  whatsapp: 'https://cdn-icons-png.flaticon.com/64/733/733585.png',
};

/** Truncates a description to a safe preview length for the email card. */
function truncateDescription(text: string, maxLength = 160): string {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength).trimEnd()}…`;
}

function escapeHtml(value: string): string {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function buildNewProductListingEmail(
  data: Record<string, unknown>,
): RenderedTemplate {
  const d = data as unknown as NewProductListingEmailData;

  const productName = escapeHtml(d.productName ?? 'A new product');
  const priceDisplay = escapeHtml(d.priceDisplay ?? '');
  const categoryName = escapeHtml(d.categoryName ?? 'General');
  const conditionLabel = escapeHtml(d.conditionLabel ?? 'New');
  const locationLabel = escapeHtml(d.locationLabel ?? '');
  const storeName = escapeHtml(d.storeName ?? 'A Kopa Mart seller');
  const shortDescription = escapeHtml(
    truncateDescription(d.shortDescription ?? ''),
  );
  const productUrl = d.productUrl ?? '#';
  const mainImageUrl = d.mainImageUrl ?? '';
  const marketplaceLogoUrl = d.marketplaceLogoUrl ?? '';
  const contactEmail = d.contactEmail ?? 'support@kopamart.com';
  const unsubscribeUrl = d.unsubscribeUrl ?? '#';
  const preferencesUrl = d.preferencesUrl ?? '#';
  const thumbnails = (d.thumbnailUrls ?? []).slice(0, 3);
  const year = new Date().getFullYear();

  const discountRow = d.originalPriceDisplay
    ? `<span style="font-size:15px;font-weight:600;color:#98a2b3;text-decoration:line-through;margin-left:8px;">${escapeHtml(d.originalPriceDisplay)}</span>`
    : '';

  const thumbnailsBlock =
    thumbnails.length > 0
      ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="padding:14px 24px 0 24px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>${thumbnails
          .map(
            (url, i) =>
              `<td class="thumb-td" width="${Math.floor(100 / thumbnails.length)}%" style="padding:0 6px;"><a href="${productUrl}"><img src="${url}" width="160" alt="${productName} — additional photo ${i + 1}" style="display:block;width:100%;height:auto;border-radius:8px;border:1px solid #eef0f3;"></a></td>`,
          )
          .join('')}</tr></table></td></tr></table>`
      : '';

  const html = `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<title>${productName} just landed on Kopa Mart</title>
<!--[if mso]>
<style>table,td,div,p,a,h1,h2,h3{font-family:Arial,sans-serif;}</style>
<![endif]-->
<style>
  body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
  table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
  img { -ms-interpolation-mode: bicubic; border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
  body { margin: 0; padding: 0; width: 100% !important; background-color: #f2f4f7; }
  a { text-decoration: none; }

  @media only screen and (max-width: 600px) {
    .email-container { width: 100% !important; }
    .fluid-padding { padding-left: 20px !important; padding-right: 20px !important; }
    .hero-title { font-size: 22px !important; line-height: 28px !important; }
    .product-name { font-size: 20px !important; line-height: 26px !important; }
    .price-text { font-size: 24px !important; }
    .thumb-td { display: block !important; width: 100% !important; padding: 0 0 8px 0 !important; }
    .cta-btn a { width: 100% !important; display: block !important; box-sizing: border-box; }
    .why-icon-td { display: block !important; width: 100% !important; padding: 0 0 16px 0 !important; }
    .footer-social-td { padding: 0 6px !important; }
  }
</style>
</head>
<body style="margin:0;padding:0;background-color:#f2f4f7;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f2f4f7;">
<tr><td align="center" style="padding:24px 12px;">
<table role="presentation" class="email-container" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;margin:0 auto;">
<tr><td align="center" style="padding:8px 0 20px 0;">
<img src="${marketplaceLogoUrl}" width="96" height="96" alt="Kopa Mart logo" style="display:block;width:96px;height:96px;max-width:96px;">
</td></tr>
<tr><td style="background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(16,24,40,0.06);">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
<td align="center" class="fluid-padding" style="background:linear-gradient(135deg,#16a34a 0%,#0f766e 100%);padding:36px 40px 44px 40px;">
<span style="display:inline-block;background-color:rgba(255,255,255,0.18);color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;padding:6px 14px;border-radius:999px;border:1px solid rgba(255,255,255,.35);">✨ New Arrival</span>
<div class="hero-title" style="padding-top:14px;font-family:Arial,Helvetica,sans-serif;font-size:26px;line-height:32px;font-weight:800;color:#ffffff;">Something new just landed</div>
<div style="padding-top:6px;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:20px;color:rgba(255,255,255,.9);">A seller you follow just added a fresh product on Kopa Mart</div>
</td></tr></table>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td align="center" style="padding:0 24px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:-28px;"><tr>
<td align="center" style="background-color:#ffffff;border-radius:14px;box-shadow:0 8px 20px rgba(16,24,40,.12);padding:8px;">
<a href="${productUrl}" style="display:block;"><img src="${mainImageUrl}" width="536" alt="${productName} — main product photo" style="display:block;width:100%;max-width:536px;height:auto;border-radius:10px;object-fit:cover;"></a>
</td></tr></table></td></tr></table>
${thumbnailsBlock}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td class="fluid-padding" style="padding:24px 32px 4px 32px;">
<div class="product-name" style="font-family:Arial,Helvetica,sans-serif;font-size:22px;line-height:28px;font-weight:800;color:#101828;">${productName}</div>
<div class="price-text" style="padding-top:8px;font-family:Arial,Helvetica,sans-serif;font-size:26px;line-height:32px;font-weight:800;color:#16a34a;">${priceDisplay}${discountRow}</div>
<div style="padding-top:14px;">
<span style="display:inline-block;background-color:#f2f4f7;color:#344054;font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:600;padding:6px 12px;border-radius:8px;margin-right:8px;">🏷️ ${categoryName}</span>
<span style="display:inline-block;background-color:#f2f4f7;color:#344054;font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:600;padding:6px 12px;border-radius:8px;margin-right:8px;">✅ ${conditionLabel}</span>
<span style="display:inline-block;background-color:#f2f4f7;color:#344054;font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:600;padding:6px 12px;border-radius:8px;">📍 ${locationLabel}</span>
</div>
<div style="padding-top:16px;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#667085;">Sold by <strong style="color:#101828;">${storeName}</strong></div>
<div style="padding-top:14px;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:22px;color:#475467;">${shortDescription}</div>
</td></tr></table>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td align="center" class="fluid-padding" style="padding:26px 32px 8px 32px;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" class="cta-btn" style="width:100%;"><tr>
<td align="center" bgcolor="#16a34a" style="border-radius:10px;">
<a href="${productUrl}" target="_blank" style="display:inline-block;width:100%;box-sizing:border-box;padding:16px 24px;font-family:Arial,Helvetica,sans-serif;font-size:16px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:10px;">View Product →</a>
</td></tr></table>
</td></tr></table>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="padding:28px 32px 0 32px;"><div style="border-top:1px solid #eaecf0;font-size:0;line-height:0;">&nbsp;</div></td></tr></table>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td class="fluid-padding" style="padding:24px 32px 24px 32px;">
<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:800;color:#101828;padding-bottom:16px;">Why you'll love this product</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
<td class="why-icon-td" width="33.33%" valign="top" style="padding-right:8px;"><div style="width:36px;height:36px;line-height:36px;text-align:center;background-color:#ecfdf3;border-radius:10px;font-size:16px;">✅</div><div style="padding-top:8px;font-family:Arial,Helvetica,sans-serif;font-size:13px;font-weight:700;color:#101828;">Verified Seller</div><div style="padding-top:2px;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:18px;color:#667085;">${storeName} is a reviewed marketplace store.</div></td>
<td class="why-icon-td" width="33.33%" valign="top" style="padding-right:8px;"><div style="width:36px;height:36px;line-height:36px;text-align:center;background-color:#eff8ff;border-radius:10px;font-size:16px;">⚡</div><div style="padding-top:8px;font-family:Arial,Helvetica,sans-serif;font-size:13px;font-weight:700;color:#101828;">Fresh Listing</div><div style="padding-top:2px;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:18px;color:#667085;">Just listed — popular items sell out fast.</div></td>
<td class="why-icon-td" width="33.33%" valign="top"><div style="width:36px;height:36px;line-height:36px;text-align:center;background-color:#fdf2fa;border-radius:10px;font-size:16px;">📍</div><div style="padding-top:8px;font-family:Arial,Helvetica,sans-serif;font-size:13px;font-weight:700;color:#101828;">Near You</div><div style="padding-top:2px;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:18px;color:#667085;">Located in ${locationLabel} for easy pickup.</div></td>
</tr></table>
</td></tr></table>
</td></tr>
<tr><td align="center" style="padding:20px 24px 4px 24px;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:18px;color:#98a2b3;">You're receiving this because you're a buyer on Kopa Mart and new listings match your interests.</td></tr>
<tr><td style="padding:24px 24px 32px 24px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
<tr><td align="center" style="padding-bottom:16px;">
<img src="${marketplaceLogoUrl}" width="64" height="64" alt="Kopa Mart logo" style="display:block;width:64px;height:64px;max-width:64px;opacity:.85;">
</td></tr>
<tr><td align="center" style="padding-bottom:16px;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;"><tr>
<td class="footer-social-td" style="padding:0 8px;"><a href="${d.facebookUrl ?? '#'}"><img src="${SOCIAL_ICON.facebook}" width="20" height="20" alt="Kopa Mart on Facebook" style="display:block;border-radius:50%;"></a></td>
<td class="footer-social-td" style="padding:0 8px;"><a href="${d.instagramUrl ?? '#'}"><img src="${SOCIAL_ICON.instagram}" width="20" height="20" alt="Kopa Mart on Instagram" style="display:block;border-radius:50%;"></a></td>
<td class="footer-social-td" style="padding:0 8px;"><a href="${d.twitterUrl ?? '#'}"><img src="${SOCIAL_ICON.twitter}" width="20" height="20" alt="Kopa Mart on X (Twitter)" style="display:block;border-radius:50%;"></a></td>
<td class="footer-social-td" style="padding:0 8px;"><a href="${d.whatsappUrl ?? '#'}"><img src="${SOCIAL_ICON.whatsapp}" width="20" height="20" alt="Chat with Kopa Mart on WhatsApp" style="display:block;border-radius:50%;"></a></td>
</tr></table>
</td></tr>
<tr><td align="center" style="font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:18px;color:#98a2b3;padding-bottom:6px;">Questions? Reach us at <a href="mailto:${contactEmail}" style="color:#667085;text-decoration:underline;">${contactEmail}</a></td></tr>
<tr><td align="center" style="font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:18px;color:#98a2b3;padding-bottom:6px;">© ${year} Kopa Mart. All rights reserved.</td></tr>
<tr><td align="center" style="font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:18px;color:#98a2b3;"><a href="${unsubscribeUrl}" style="color:#98a2b3;text-decoration:underline;">Unsubscribe</a>&nbsp;·&nbsp;<a href="${preferencesUrl}" style="color:#98a2b3;text-decoration:underline;">Manage email preferences</a></td></tr>
</table>
</td></tr>
</table>
</td></tr></table>
</td></tr></table>
</body>
</html>`;

  return {
    title: `✨ ${d.productName ?? 'New product'} just landed on Kopa Mart`,
    body: `${d.productName ?? 'A new product'} is now available for ${d.priceDisplay ?? ''} from ${d.storeName ?? 'a Kopa Mart seller'}.`,
    html,
  };
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
    [NotificationType.NEW_PRODUCT_LISTING]: (data) =>
      buildNewProductListingEmail(data),
    [NotificationType.REVIEW_REQUEST]: (data) => {
      const sellerName = escapeHtml(String(data.sellerName));
      const productName = escapeHtml(String(data.productName));
      const productImageUrl = String(data.productImageUrl);
      const deepLink = String(data.deepLink);

      const imageBlock = productImageUrl
        ? `<img src="${productImageUrl}" width="120" alt="${productName}" style="display:block;border-radius:8px;margin:0 auto 16px auto;">`
        : '';

      return {
        title: `How was your experience with ${sellerName}?`,
        body: `Tell other buyers what you thought of ${productName}.`,
        html: `<div style="font-family:sans-serif;text-align:center;padding:24px;">${imageBlock}<h2>How did it go with ${sellerName}?</h2><p>You reached out about <strong>${productName}</strong> a little while ago — mind leaving a quick rating for other buyers?</p><a href="${deepLink}" style="display:inline-block;margin-top:16px;padding:12px 24px;background:#111827;color:#ffffff;border-radius:6px;text-decoration:none;">Leave a review</a></div>`,
      };
    },
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
    [NotificationType.NEW_PRODUCT_LISTING]: (data) => ({
      title: '✨ New arrival on Kopa Mart',
      body: `${String(data.productName)} just landed for ${String(data.priceDisplay)} — from ${String(data.storeName)}.`,
    }),
    [NotificationType.REVIEW_REQUEST]: (data) => ({
      title: `How was your experience with ${String(data.sellerName)}?`,
      body: `Tell other buyers what you thought of ${String(data.productName)}.`,
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
