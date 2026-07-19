import { Inject, Injectable, OnModuleDestroy } from '@nestjs/common';
import { NOTIFICATION_REDIS_CONNECTION } from '../constant';
import Redis from 'ioredis';
import { AppLogger } from '../../logger/logger.service';

@Injectable()
export class RedisHealthService implements OnModuleDestroy {
  private available = false;

  constructor(
    @Inject(NOTIFICATION_REDIS_CONNECTION)
    private readonly redis: Redis,
    private readonly logger: AppLogger,
  ) {
    this.available = this.redis.status === 'ready';

    this.redis.on('ready', () => {
      this.available = true;
      if (!this.available) {
        this.logger.log(
          'Redis connection restored - resuming queues sends',
          'RedisHealthService',
        );
      }
    });

    this.redis.on('error', (err) => {
      if (this.available) {
        this.logger.error(
          `Redis connection error, switching to synchronous fallback: ${err.message}`,
          undefined,
          'RedisHealthService',
        );
      }

      this.available = false;
    });

    this.redis.on('close', () => {
      this.available = false;
    });
  }

  isAvailable(): boolean {
    return this.available;
  }

  onModuleDestroy() {
    this.redis.removeAllListeners('ready');
    this.redis.removeAllListeners('error');
    this.redis.removeAllListeners('close');
  }
}
