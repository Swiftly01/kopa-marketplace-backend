import { ConfigService } from '@nestjs/config';
import Redis, { RedisOptions } from 'ioredis';
import { NOTIFICATION_REDIS_CONNECTION } from '../constant';
import { buildRedisOptionsFromUrl } from '../../redis/redis-connection.factory';

export function buildRedisConnectionOptions(
  configService: ConfigService,
): RedisOptions {
  const driver = configService.get<string>(
    'notificationConfig.queueDriver',
    'bullmq',
  );
  const url: string =
    configService.get<string>('redis.url') ??
    configService.getOrThrow<string>('notificationConfig.redis.url');

  return buildRedisOptionsFromUrl(url, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    lazyConnect: driver === 'sync',
  });
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
