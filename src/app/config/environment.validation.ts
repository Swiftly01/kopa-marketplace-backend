import * as Joi from 'joi';

export default Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'test', 'production', 'staging')
    .default('development'),

  API_VERSION: Joi.string().required(),

  // Allow Railway-style connection OR local DB variables
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
  UPSTASH_REDIS_URL: Joi.string()
    .uri({ scheme: ['rediss', 'redis'] })
    .required(),

  NOTIFICATION_EMAIL_DRIVER: Joi.string()
    .valid('smtp', 'app-email-service')
    .default('smtp'),

  SMS_DRIVER: Joi.string().valid('termii', 'twilio').default('termii'),
  TERMII_API_KEY: Joi.string().when('SMS_DRIVER', {
    is: 'termii',
    then: Joi.required(),
    otherwise: Joi.optional(),
  }),
  TERMII_SENDER_ID: Joi.string().default('KopaMart'),
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

  NOTIFICATION_DAILY_USER_CAP: Joi.number().integer().positive().default(50),

  NOTIFICATION_ENABLE_SYNC_FALLBACK: Joi.string()
    .valid('true', 'false')
    .default('true'),
});
