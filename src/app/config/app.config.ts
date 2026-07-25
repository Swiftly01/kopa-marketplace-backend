import { registerAs } from '@nestjs/config';

export default registerAs('appConfig', () => ({
  environment: process.env ?? 'production',
  apiVersion: process.env.API_VERSION,
  appName: process.env.APP_NAME ?? 'Kopa Marketplace',
  appLogoUrl:
    process.env.APP_LOGO_URL ?? 'https://kopamart.com/icons/pwa-192.png',
  frontEndUrl: process.env.FRONTEND_URL ?? 'https://kopamart.com',
  mailFrom: process.env.MAIL_FROM ?? 'support@kopamart.com',
  supportWhatsappNumber: process.env.SUPPORT_WHATSAPP_NUMBER,
  twitterUrl: process.env.TWITTER_URL,
  tiktokUrl: process.env.TIKTOK_URL,
  instagramUrl: process.env.INSTAGRAM_URL,
  facebookUrl: process.env.FACEBOOK_URL,
}));
