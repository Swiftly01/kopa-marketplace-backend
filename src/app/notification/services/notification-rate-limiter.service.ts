import { Inject, Injectable } from '@nestjs/common';
import { NOTIFICATION_REDIS_CONNECTION } from '../constant';
import { ConfigService } from '@nestjs/config';
import { AppLogger } from '../../logger/logger.service';
import type Redis from 'ioredis';

@Injectable()
export class NotificationRateLimiterService {
  private readonly dailyCap: number;

  constructor(
    @Inject(NOTIFICATION_REDIS_CONNECTION)
    private readonly redis: Redis,
    private readonly configService: ConfigService,
    private readonly logger: AppLogger,
  ) {
    this.dailyCap = this.configService.get<number>(
      'notificationConfig.dailyPerUserCap',
      50,
    );
  }

  async consume(userId: string): Promise<boolean> {
    try {
      const key = `notif:rate:${userId}:${this.todayBucket()}`;
      const count = await this.redis.incr(key);

      if (count === 1) {
        await this.redis.expire(key, 60 * 60 * 26);
      }

      return count <= this.dailyCap;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn(
        `Rate limiter Redis call failed, failing open for user=${userId}: ${message}`,
        'NotificationRateLimiterService',
      );
      return true;
    }
  }

  private todayBucket(): string {
    return new Date().toISOString().slice(0, 10);
  }
}
