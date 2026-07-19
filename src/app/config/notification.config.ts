import { registerAs } from '@nestjs/config';

export default registerAs('notificationConfig', () => ({
  redis: {
    url: process.env.UPSTASH_REDIS_URL,
  },
  email: {
    driver: process.env.NOTIFICATION_EMAIL_DRIVER,
  },
  sms: {
    driver: process.env.SMS_DRIVER || 'termii',
    termii: {
      apiKey: process.env.TERMII_API_KEY,
      senderId: process.env.TERMII_SENDER_ID,
      baseUrl: process.env.TERMII_BASE_URL,
    },
    twillo: {
      accountSid: process.env.TWILIO_ACCOUNT_SID,
      authToken: process.env.TWILIO_AUTH_TOKEN,
      fromNumber: process.env.TWILIO_FROM_NUMBER,
    },
  },

  push: {
    firebase: {
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY,
    },
  },
  dailyPerUserCap: Number(process.env.NOTIFICATION_DAILY_USER_CAP || 50),
  enableSyncFallback: process.env.NOTIFICATION_ENABLE_SYNC_FALLBACK !== 'false',
}));
