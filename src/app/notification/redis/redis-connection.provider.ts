import { ConfigService } from '@nestjs/config';
import Redis, { RedisOptions } from 'ioredis';
import { NOTIFICATION_REDIS_CONNECTION } from '../constant';

export function buildRedisConnectionOptions(
  configService: ConfigService,
): RedisOptions {
  const driver = configService.get<string>(
    'notificationConfig.queueDriver',
    'bullmq',
  );
  const url: string = configService.getOrThrow<string>(
    'notificationConfig.redis.url',
  );

  const parsed = new URL(url);

  return {
    host: parsed.hostname,
    port: Number(parsed.port || 6379),
    username: parsed.username || undefined,
    password: parsed.password || undefined,
    tls: parsed.protocol === 'rediss:' ? {} : undefined,
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    lazyConnect: driver === 'sync',
    retryStrategy: (attempts: number) => Math.min(attempts * 200, 5000),
  };
}

export const redisConnectionProvider = {
  provide: NOTIFICATION_REDIS_CONNECTION,
  useFactory: (configService: ConfigService): Redis => {
    const options = buildRedisConnectionOptions(configService);
    const redis = new Redis(options);
    return redis;
  },
  inject: [ConfigService],
};
