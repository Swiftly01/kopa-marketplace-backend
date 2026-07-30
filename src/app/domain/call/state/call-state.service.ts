import { Injectable } from '@nestjs/common';
import { RedisService } from '../../../redis/redis.service';

const CALL_TTL_SECONDS = 60 * 60 * 4;

@Injectable()
export class CallStateService {
  constructor(private readonly redis: RedisService) {}

  private callSocketsKey(callId: string): string {
    return `call:sockets:${callId}`;
  }

  private socketCallKey(socketId: string): string {
    return `call:socket-call:${socketId}`;
  }

  async trackSocket(socketId: string, callId: string): Promise<void> {
    await this.redis.setValue(
      this.socketCallKey(socketId),
      callId,
      CALL_TTL_SECONDS,
    );
    await this.redis.addToSet(
      this.callSocketsKey(callId),
      socketId,
      CALL_TTL_SECONDS,
    );
  }

  async getCallIdForSocket(socketId: string): Promise<string | null> {
    return this.redis.getValue(this.socketCallKey(socketId));
  }

  async removeSocket(socketId: string, callId: string): Promise<number> {
    await this.redis.deleteKey(this.socketCallKey(socketId));
    await this.redis.removeFromSet(this.callSocketsKey(callId), socketId);
    return this.redis.setSize(this.callSocketsKey(callId));
  }

  async cleanupCall(callId: string, socketIds: string[]): Promise<void> {
    await Promise.all(
      socketIds.map((sid) => this.redis.deleteKey(this.socketCallKey(sid))),
    );
    await this.redis.deleteKey(this.callSocketsKey(callId));
  }

  async getSocketsForCall(callId: string): Promise<string[]> {
    return this.redis.setMembers(this.callSocketsKey(callId));
  }
}
