import { Injectable } from '@nestjs/common';
import { RedisService } from '../../../redis/redis.service';
import { WsException } from '@nestjs/websockets';

const WINDOW_SECONDS = 60;

@Injectable()
export class CallRateLimiterService {
  constructor(private readonly redis: RedisService) {}

  async checkAndIncrement(socketId: string, limit = 50): Promise<void> {
    const key = `call:ratelimit:${socketId}`;
    const count = await this.redis.incrementWithExpiry(key, WINDOW_SECONDS);

    if (count > limit) {
      throw new WsException('Rate limit exceeded');
    }
  }
}
