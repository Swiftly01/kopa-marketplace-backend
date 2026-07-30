import { Inject, Injectable, OnModuleDestroy } from '@nestjs/common';
import {
  REDIS_CLIENT,
  REDIS_PUB_CLIENT,
  REDIS_SUB_CLIENT,
} from './constants/redis.constants';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleDestroy {
  constructor(
    @Inject(REDIS_CLIENT)
    public readonly client: Redis,
    @Inject(REDIS_PUB_CLIENT)
    private readonly pubClient: Redis,
    @Inject(REDIS_SUB_CLIENT)
    private readonly subClient: Redis,
  ) {}

  async addToSet(key: string, member: string, ttlSeconds?: number) {
    await this.client.sadd(key, member);
    if (ttlSeconds) await this.client.expire(key, ttlSeconds);
  }

  async removeFromSet(key: string, member: string) {
    await this.client.srem(key, member);
  }

  async setMembers(key: string): Promise<string[]> {
    return this.client.smembers(key);
  }

  async setSize(key: string): Promise<number> {
    return this.client.scard(key);
  }

  async deleteKey(key: string) {
    await this.client.del(key);
  }

  async setValue(key: string, value: string, ttlSeconds?: number) {
    if (ttlSeconds) {
      await this.client.set(key, value, 'EX', ttlSeconds);
    } else {
      await this.client.set(key, value);
    }
  }

  async getValue(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  async incrementWithExpiry(
    key: string,
    windowSeconds: number,
  ): Promise<number> {
    const count = await this.client.incr(key);

    if (count === 1) {
      await this.client.expire(key, windowSeconds);
    }

    return count;
  }

  onModuleDestroy() {
    this.client.disconnect();
    this.pubClient.disconnect();
    this.subClient.disconnect();
  }
}
