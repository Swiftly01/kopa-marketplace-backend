// BullMQ queue names
export const QUEUE_NAMES = {
  DISPATCH: 'notification.dispatch',
  EMAIL: 'notification.email',
  SMS: 'notification.sms',
  PUSH: 'notification.push',
  DEAD_LETTER: 'notification.dead-letter',
} as const;

// DI token
export const NOTIFICATION_REDIS_CONNECTION = Symbol(
  'NOTIFICATION_REDIS_CONNECTION',
);

export const EMAIL_CHANNEL_PROVIDER = Symbol('EMAIL_CHANNEL_PROVIDER');
export const SMS_CHANNEL_PROVIDER = Symbol('SMS_CHANNEL_PROVIDER');
export const PUSH_CHANNEL_PROVIDER = Symbol('PUSH_CHANNEL_PROVIDER');

export const DEFAULT_JOB_OPTIONS = {
  attempts: 5,
  backoff: {
    type: 'exponential' as const,
    delay: 2000,
  },
  removeOnComplete: {
    age: 60 * 60 * 24,
    count: 5000,
  },
  removeOnFail: {
    age: 60 * 60 * 24 * 7,
  },
};

export const CHANNEL_RATE_LIMITS = {
  EMAIL: { max: 50, duration: 1000 },
  SMS: { max: 10, duration: 1000 },
  PUSH: { max: 500, duration: 1000 },
};

export const CHANNEL_CONCURRENCY = {
  EMAIL: 10,
  SMS: 5,
  PUSH: 20,
};

export const MAX_BATCH_RECIPIENTS = 100;

export const BATCH_TTL_SECONDS = 60 * 60;

export const BATCH_REDIS_PREFIX = 'notif:recipient-batch';
