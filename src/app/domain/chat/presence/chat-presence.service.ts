import { Injectable } from '@nestjs/common';
import { RedisService } from '../../../redis/redis.service';

@Injectable()
export class ChatPresenceService {
  constructor(private readonly redis: RedisService) {}

  private key(userId: string) {
    return `chat:presence:${userId}`;
  }

  async addSocket(userId: string, socketId: string): Promise<void> {
    await this.redis.addToSet(this.key(userId), socketId);
  }

  async removeSocket(userId: string, socketId: string): Promise<number> {
    await this.redis.removeFromSet(this.key(userId), socketId);
    return this.redis.setSize(this.key(userId));
  }

  async isOnline(userId: string): Promise<boolean> {
    return (await this.redis.setSize(this.key(userId))) > 0;
  }
}
