import * as Joi from 'joi';

export default Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'test', 'production', 'staging')
    .default('development'),

  API_VERSION: Joi.string().required(),

  APP_NAME: Joi.string().optional(),
  FRONTEND_URL: Joi.string()
    .uri({ scheme: ['http', 'https'] })
    .optional(),
  APP_LOGO_URL: Joi.string()
    .uri({ scheme: ['http', 'https'] })
    .optional(),

  DATABASE_URL: Joi.string().optional(),

  DATABASE_HOST: Joi.string().when('DATABASE_URL', {
    is: Joi.exist(),
    then: Joi.optional(),
    otherwise: Joi.required(),
  }),

  DATABASE_PORT: Joi.number().port().default(5432),

  DATABASE_USER: Joi.string().when('DATABASE_URL', {
    is: Joi.exist(),
    then: Joi.optional(),
    otherwise: Joi.required(),
  }),

  DATABASE_PASSWORD: Joi.string().when('DATABASE_URL', {
    is: Joi.exist(),
    then: Joi.optional(),
    otherwise: Joi.required(),
  }),

  DATABASE_NAME: Joi.string().when('DATABASE_URL', {
    is: Joi.exist(),
    then: Joi.optional(),
    otherwise: Joi.required(),
  }),
  NOTIFICATION_QUEUE_DRIVER: Joi.string()
    .valid('bullmq', 'sync')
    .default('bullmq'),

  UPSTASH_REDIS_URL: Joi.string()
    .uri({ scheme: ['rediss', 'redis'] })
    .when('NOTIFICATION_QUEUE_DRIVER', {
      is: 'sync',
      then: Joi.optional(),
      otherwise: Joi.required(),
    }),

  NOTIFICATION_EMAIL_DRIVER: Joi.string()
    .valid('smtp', 'app-email-service')
    .default('smtp'),

  EMAIL_DRIVER: Joi.string().valid('smtp', 'resend').required(),

  MAIL_HOST: Joi.string().when('EMAIL_DRIVER', {
    is: 'smtp',
    then: Joi.required(),
    otherwise: Joi.optional(),
  }),
  MAIL_PORT: Joi.number().port().when('EMAIL_DRIVER', {
    is: 'smtp',
    then: Joi.required(),
    otherwise: Joi.optional(),
  }),
  MAIL_USER: Joi.string().when('EMAIL_DRIVER', {
    is: 'smtp',
    then: Joi.required(),
    otherwise: Joi.optional(),
  }),
  MAIL_PASSWORD: Joi.string().when('EMAIL_DRIVER', {
    is: 'smtp',
    then: Joi.required(),
    otherwise: Joi.optional(),
  }),
  MAIL_FROM: Joi.string().email().required(),

  RESEND_API_KEY: Joi.string().when('EMAIL_DRIVER', {
    is: 'resend',
    then: Joi.required(),
    otherwise: Joi.optional(),
  }),
  RESEND_MAIL_FROM: Joi.string()
    .pattern(/^([^<>]+<)?[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+(>)?$/)
    .when('EMAIL_DRIVER', {
      is: 'resend',
      then: Joi.required(),
      otherwise: Joi.optional(),
    }),
  SMS_DRIVER: Joi.string().valid('termii', 'twilio').default('termii'),
  TERMII_API_KEY: Joi.string().when('SMS_DRIVER', {
    is: 'termii',
    then: Joi.required(),
    otherwise: Joi.optional(),
  }),
  TERMII_SENDER_ID: Joi.string().default('KopaMart'),
  TERMII_BASE_URL: Joi.string()
    .uri({ scheme: ['http', 'https'] })
    .optional(),

  TWILIO_ACCOUNT_SID: Joi.string().when('SMS_DRIVER', {
    is: 'twilio',
    then: Joi.required(),
    otherwise: Joi.optional(),
  }),
  TWILIO_AUTH_TOKEN: Joi.string().when('SMS_DRIVER', {
    is: 'twilio',
    then: Joi.required(),
    otherwise: Joi.optional(),
  }),
  TWILIO_FROM_NUMBER: Joi.string().when('SMS_DRIVER', {
    is: 'twilio',
    then: Joi.required(),
    otherwise: Joi.optional(),
  }),

  FIREBASE_PROJECT_ID: Joi.string().required(),
  FIREBASE_CLIENT_EMAIL: Joi.string().email().required(),
  FIREBASE_PRIVATE_KEY: Joi.string().required(),

  NOTIFICATION_DEFAULT_URL: Joi.string()
    .uri({ scheme: ['http', 'https'] })
    .optional(),
  NOTIFICATION_DEFAULT_ICON: Joi.string()
    .uri({ scheme: ['http', 'https'] })
    .optional(),
  NOTIFICATION_DEFAULT_BADGE: Joi.string()
    .uri({ scheme: ['http', 'https'] })
    .optional(),
  NOTIFICATION_DEFAULT_IMAGE: Joi.string()
    .uri({ scheme: ['http', 'https'] })
    .optional(),

  NOTIFICATION_DAILY_USER_CAP: Joi.number().integer().positive().default(50),

  NOTIFICATION_ENABLE_SYNC_FALLBACK: Joi.string()
    .valid('true', 'false')
    .default('true'),

  SUPPORT_WHATSAPP_NUMBER: Joi.string()
    .pattern(/^\+?[1-9]\d{7,14}$/)
    .optional(),
  FACEBOOK_URL: Joi.string()
    .uri({ scheme: ['http', 'https'] })
    .optional(),
  INSTAGRAM_URL: Joi.string()
    .uri({ scheme: ['http', 'https'] })
    .optional(),
  TWITTER_URL: Joi.string()
    .uri({ scheme: ['http', 'https'] })
    .optional(),
  TIKTOK_URL: Joi.string()
    .uri({ scheme: ['http', 'https'] })
    .optional(),
});
