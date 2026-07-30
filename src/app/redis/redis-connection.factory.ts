import { ConfigService } from '@nestjs/config';
import { RedisOptions } from 'ioredis';

export function buildRedisOptionsFromUrl(
  url: string,
  overrides: Partial<RedisOptions> = {},
): RedisOptions {
  const parsed = new URL(url);

  return {
    host: parsed.hostname,
    port: Number(parsed.port || 6379),
    username: parsed.username || undefined,
    password: parsed.password || undefined,
    tls: parsed.protocol === 'rediss:' ? {} : undefined,
    retryStrategy: (attempts: number) => Math.min(attempts * 200, 5000),
    ...overrides,
  };
}

export function buildSharedRedisOptions(
  configService: ConfigService,
  overrides: Partial<RedisOptions> = {},
): RedisOptions {
  const url = configService.getOrThrow<string>('redis.url');
  const keyPrefix = configService.getOrThrow<string>('redis.keyPrefix');

  return buildRedisOptionsFromUrl(url, { keyPrefix, ...overrides });
}
