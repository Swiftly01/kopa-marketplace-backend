import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  WsException,
} from '@nestjs/websockets';
import { Server } from 'socket.io';

import { AppSocket } from '../chat/types/socket.types';
import { MessageType } from '../messages/enums/message-type';
import { MessagesService } from '../messages/messages.service';
import { UserService } from '../users/user.service';
import { CallSession } from './call-session.entity';
import { CallService } from './call.service';
import { CallActionDto } from './dtos/call-action.dto';
import { IceCandidateDto } from './dtos/ice-candidate.dto';
import { InitiateCallDto } from './dtos/initiate-call.dto';
import { SdpDto } from './dtos/sdp.dto';
import { CallStatus } from './enums/call-status.enum';
import { RTCIceServer } from './interfaces/rtc-ice-server.interface';
import { CallStateService } from './state/call-state.service';
import { CallRateLimiterService } from './state/call-rate-limiter.service';

@WebSocketGateway({
  namespace: '/call',
  cors: { origin: '*', credentials: true },
  transports: ['websocket', 'polling'],
})
export class CallGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(CallGateway.name);
  /*
  private activeCalls: Map<string, Set<string>> = new Map();
  private socketToCall: Map<string, string> = new Map();
  private readonly socketRateLimit = new Map<
    string,
    { count: number; timestamp: number }
  >();
*/
  private readonly callTimeouts = new Map<string, NodeJS.Timeout>();

  constructor(
    private readonly callService: CallService,
    private readonly userService: UserService,
    private readonly messagesService: MessagesService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly callState: CallStateService,
    private readonly callRateLimiter: CallRateLimiterService,
  ) {}

  async handleConnection(client: AppSocket) {
    try {
      const rawToken =
        (client.handshake.auth?.token as string) ||
        (client.handshake.headers?.authorization as string) ||
        '';

      const token = rawToken.startsWith('Bearer')
        ? rawToken.slice(7)
        : rawToken;

      if (!token) {
        client.emit('call_error', {
          message: 'Authentication token is required',
        });
        client.disconnect(true);
        return;
      }

      const payload = this.jwtService.verify<{ sub: string }>(token, {
        secret: this.configService.get<string>('app.jwtSecret'),
      });

      const user = await this.userService.findById(payload.sub);
      client.data.userId = user.id;
      client.data.user = user;

      await client.join(`user:${user.id}`);
      this.logger.log(`Call gateway: user ${user.id} connected (${client.id})`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn(`Call gateway: rejected ${message}`);
      client.emit('call_error', { message: 'Invalid or expired token' });
      client.disconnect(true);
    }
  }

  async handleDisconnect(client: AppSocket) {
    const callId = await this.callState.getCallIdForSocket(client.id);
    if (!callId) return;

    const remaining = await this.callState.removeSocket(client.id, callId);

    if (remaining < 2) {
      try {
        const call = await this.callService.findById(callId);

        if (
          call.status === CallStatus.ACTIVE ||
          call.status === CallStatus.RINGING
        ) {
          await this.callService.updateStatus(
            callId,
            'system',
            CallStatus.FAILED,
          );

          this.server.to(`call:${callId}`).emit('call_failed', {
            callId,
            reason: 'Peer disconnected unexpectedly',
          });

          await this.postCallSummaryIfLinked(call);

          await this.cleanupRoom(callId);

          const timeout = this.callTimeouts.get(callId);
          if (timeout) {
            clearTimeout(timeout);
            this.callTimeouts.delete(callId);
          }
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown';
        this.logger.warn(
          `Disconnect cleanup failed for call ${callId}: ${message}`,
        );
      }
    }

    /*
    this.socketRateLimit.delete(client.id);

    const callId = this.socketToCall.get(client.id);
    if (!callId) return;

    this.socketToCall.delete(client.id);

    const sockets = this.activeCalls.get(callId);

    if (sockets) {
      sockets.delete(client.id);

      if (sockets.size < 2) {
        try {
          const call = await this.callService.findById(callId);
          if (
            call.status === CallStatus.ACTIVE ||
            call.status === CallStatus.RINGING
          ) {
            await this.callService.updateStatus(
              callId,
              'system',
              CallStatus.FAILED,
            );

            this.server.to(`call:${callId}`).emit('call_failed', {
              callId,
              reason: 'Peer disconnected unexpectedly',
            });

            // FIX: post call summary on unexpected disconnect, consistent with
            // call_end / call_decline / call_cancel paths
            await this.postCallSummaryIfLinked(call);

            this.cleanupRoom(callId);

            const timeout = this.callTimeouts.get(callId);
            if (timeout) {
              clearTimeout(timeout);
              this.callTimeouts.delete(callId);
            }
          }
        
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Unknown';
          this.logger.warn(
            `Disconnect cleanup failed for call ${callId}: ${message}`,
          );
        }
      }
    }

    */
  }

  @SubscribeMessage('call_initiate')
  async handleInitiate(
    @MessageBody() dto: InitiateCallDto,
    @ConnectedSocket() client: AppSocket,
  ) {
    // this.checkRateLimit(client.id);
    await this.callRateLimiter.checkAndIncrement(client.id);

    const callerId = client.data.userId;

    // Guard: prevent self-calls
    if (callerId === dto.calleeId) {
      throw new WsException('Cannot call yourself');
    }

    let call: CallSession;

    try {
      call = await this.callService.initiateCall(callerId, dto);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown';
      throw new WsException(message);
    }

    const room = `call:${call.id}`;
    await client.join(room);
    // this.trackSocket(client.id, call.id);
    await this.callState.trackSocket(client.id, call.id);

    const userRoom = `user:${dto.calleeId}`;
    const socketsInRoom = await this.server.in(userRoom).fetchSockets();

    if (socketsInRoom.length === 0) {
      // Callee is offline — immediately mark missed and bail out
      await this.callService.updateStatus(call.id, 'system', CallStatus.MISSED);
      await this.cleanupRoom(call.id);
      return {
        event: 'call_unreachable',
        callId: call.id,
        message: 'Callee is not online',
      };
    }

    this.logger.log(
      `Emitting call_incoming to room ${userRoom}, sockets present: ${socketsInRoom.length}`,
    );

    this.server.to(userRoom).emit('call_incoming', {
      callId: call.id,
      type: call.type,
      caller: {
        id: client.data.userId,
        name: client.data.user.firstName,
      },
      iceServers: this.getIceServers(),
    });

    await this.callService.updateStatus(call.id, 'system', CallStatus.RINGING);

    const timeout = setTimeout(() => {
      void (async () => {
        try {
          const latest = await this.callService.findById(call.id);

          if (latest.status === CallStatus.RINGING) {
            await this.callService.updateStatus(
              call.id,
              'system',
              CallStatus.MISSED,
            );

            this.server.to(`call:${call.id}`).emit('call_missed', {
              callId: call.id,
              fullName: call.caller.firstName,
            });

            await this.cleanupRoom(call.id);
          }
        } catch (error) {
          this.logger.error(
            `Missed-call timeout error for call ${call.id}: ${error}`,
          );
        } finally {
          this.callTimeouts.delete(call.id);
        }
      })();
    }, 30_000);
    this.callTimeouts.set(call.id, timeout);

    this.logger.log(`Call ${call.id}: INITIATED → RINGING`);

    return {
      event: 'call_initiated',
      callId: call.id,
      iceServers: this.getIceServers(),
    };
  }

  @SubscribeMessage('call_join')
  async handleJoin(
    @MessageBody() data: { callId: string },
    @ConnectedSocket() client: AppSocket,
  ) {
    const call = await this.callService.findById(data.callId);
    const userId = client.data.userId;

    if (call.calleeId !== userId && call.callerId !== userId) {
      throw new WsException('You are not a participant of this call');
    }

    const room = `call:${call.id}`;
    await client.join(room);
    await this.callState.trackSocket(client.id, call.id);

    client.data.callId = call.id;
    client.data.callerId = call.callerId;
    client.data.calleeId = call.calleeId;

    client.broadcast.to(room).emit('call_peer_joined', {
      callId: call.id,
      userId,
    });

    this.logger.log(
      `Call ${call.id}: ${userId} joined room, broadcasting call_peer_joined`,
    );

    return { event: 'call_joined', callId: call.id };
  }

  @SubscribeMessage('call_offer')
  async handleOffer(
    @MessageBody() dto: SdpDto,
    @ConnectedSocket() client: AppSocket,
  ) {
    // this.checkRateLimit(client.id);
    await this.callRateLimiter.checkAndIncrement(client.id);
    await this.assertParticipantFromCache(dto.callId, client);

    client.broadcast.to(`call:${dto.callId}`).emit('call_offer', {
      callId: dto.callId,
      sdpType: dto.sdpType,
      sdp: dto.sdp,
    });

    this.logger.log(`Call ${dto.callId}: SDP offer relayed`);
  }

  @SubscribeMessage('call_answer')
  async handleAnswer(
    @MessageBody() dto: SdpDto,
    @ConnectedSocket() client: AppSocket,
  ) {
    //  this.checkRateLimit(client.id);
    await this.callRateLimiter.checkAndIncrement(client.id);
    const calleeId = client.data.userId;

    await this.assertParticipantFromCache(dto.callId, client);

    client.broadcast.to(`call:${dto.callId}`).emit('call_answer', {
      callId: dto.callId,
      sdpType: dto.sdpType,
      sdp: dto.sdp,
    });

    const timeout = this.callTimeouts.get(dto.callId);
    if (timeout) {
      clearTimeout(timeout);
      this.callTimeouts.delete(dto.callId);
    }

    await this.callService.updateStatus(
      dto.callId,
      calleeId,
      CallStatus.ACTIVE,
    );

    this.logger.log(`Call ${dto.callId}: SDP answer relayed → Active`);
  }

  @SubscribeMessage('call_ice_candidate')
  async handleIceCandidate(
    @MessageBody() dto: IceCandidateDto,
    @ConnectedSocket() client: AppSocket,
  ) {
    // this.checkRateLimit(client.id);
    await this.callRateLimiter.checkAndIncrement(client.id);

    await this.assertParticipantFromCache(dto.callId, client);

    client.broadcast.to(`call:${dto.callId}`).emit('call_ice_candidate', {
      callId: dto.callId,
      candidate: dto.candidate,
      sdpMid: dto.sdpMid,
      sdpMLineIndex: dto.sdpMLineIndex,
    });
  }

  @SubscribeMessage('call_decline')
  async handleDecline(
    @MessageBody() dto: CallActionDto,
    @ConnectedSocket() client: AppSocket,
  ) {
    const calleeId = client.data.userId;

    const existingCall = await this.callService.findById(dto.callId);

    if (existingCall.calleeId !== calleeId) {
      throw new WsException('Only the callee can decline a call');
    }

    const call = await this.callService.updateStatus(
      dto.callId,
      calleeId,
      CallStatus.DECLINED,
    );

    this.server.to(`call:${dto.callId}`).emit('call_decline', {
      callId: dto.callId,
      calleeId,
    });

    await this.postCallSummaryIfLinked(call);
    await this.cleanupRoom(dto.callId);
    const timeout = this.callTimeouts.get(dto.callId);

    if (timeout) {
      clearTimeout(timeout);
      this.callTimeouts.delete(dto.callId);
    }

    this.logger.log(`Call ${dto.callId}: declined by ${calleeId}`);
  }

  @SubscribeMessage('call_cancel')
  async handleCancel(
    @MessageBody() dto: CallActionDto,
    @ConnectedSocket() client: AppSocket,
  ) {
    const callerId = client.data.userId;

    const existingCall = await this.callService.findById(dto.callId);

    if (existingCall.callerId !== callerId) {
      throw new WsException('Only the caller can cancel a call');
    }

    const call = await this.callService.updateStatus(
      dto.callId,
      callerId,
      CallStatus.CANCELLED,
    );

    this.server.to(`call:${dto.callId}`).emit('call_cancelled', {
      callId: dto.callId,
      callerId,
    });

    await this.postCallSummaryIfLinked(call);
    await this.cleanupRoom(dto.callId);
    const timeout = this.callTimeouts.get(dto.callId);

    if (timeout) {
      clearTimeout(timeout);
      this.callTimeouts.delete(dto.callId);
    }

    this.logger.log(`Call ${dto.callId}: cancelled by ${callerId}`);
  }

  @SubscribeMessage('call_end')
  async handleEnd(
    @MessageBody() dto: CallActionDto,
    @ConnectedSocket() client: AppSocket,
  ) {
    const userId = client.data.userId;
    const call = await this.callService.updateStatus(
      dto.callId,
      userId,
      CallStatus.ENDED,
    );

    this.server.to(`call:${dto.callId}`).emit('call_ended', {
      callId: dto.callId,
      endedBy: userId,
      durationSeconds: call.durationSeconds,
    });

    await this.postCallSummaryIfLinked(call);
    await this.cleanupRoom(dto.callId);
    const timeout = this.callTimeouts.get(dto.callId);

    if (timeout) {
      clearTimeout(timeout);
      this.callTimeouts.delete(dto.callId);
    }

    this.logger.log(
      `Call ${dto.callId}: ended by ${userId} (${call.durationSeconds ?? 0}s)`,
    );
  }

  private async assertParticipantFromCache(
    callId: string,
    client: AppSocket,
  ): Promise<void> {
    const userId = client.data.userId;

    // Cache hit — zero DB cost
    if (
      client.data.callId === callId &&
      client.data.callerId &&
      client.data.calleeId
    ) {
      if (client.data.callerId !== userId && client.data.calleeId !== userId) {
        throw new WsException('You are not a participant of this call');
      }
      return;
    }

    // Cache miss — fall back to DB and warm the cache
    const call = await this.callService.findById(callId);
    if (call.callerId !== userId && call.calleeId !== userId) {
      throw new WsException('You are not a participant of this call');
    }

    client.data.callId = call.id;
    client.data.callerId = call.callerId;
    client.data.calleeId = call.calleeId;
  }
  /*
  private trackSocket(socketId: string, callId: string) {
    this.socketToCall.set(socketId, callId);

    if (!this.activeCalls.has(callId)) {
      this.activeCalls.set(callId, new Set());
    }
    this.activeCalls.get(callId)?.add(socketId);
  }
    */

  private async cleanupRoom(callId: string): Promise<void> {
    const socketIds = await this.callState.getSocketsForCall(callId);
    await this.callState.cleanupCall(callId, socketIds);
  }
  private getIceServers(): RTCIceServer[] {
    const iceServers: RTCIceServer[] = [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
    ];

    const turnUrl = this.configService.get<string>('TURN_URL');
    const turnUsername = this.configService.get<string>('TURN_USERNAME');
    const turnCredential = this.configService.get<string>('TURN_CREDENTIAL');

    if (turnUrl && turnUsername && turnCredential) {
      iceServers.push({
        urls: turnUrl,
        username: turnUsername,
        credential: turnCredential,
      });
    }

    return iceServers;
  }

  private async postCallSummaryIfLinked(call: CallSession): Promise<void> {
    if (!call.conversationId) return;

    try {
      const summary = this.callService.buildCallSummaryMessage(call);
      await this.messagesService.createMessage({
        conversationId: call.conversationId,
        senderId: call.callerId,
        content: summary,
        type: MessageType.SYSTEM,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown';
      this.logger.error(`Failed to post call summary message: ${message}`);
    }
  }

  /*
  private checkRateLimit(socketId: string, limit = 50) {
    const now = Date.now();
    const existing = this.socketRateLimit.get(socketId);

    if (!existing || now - existing.timestamp > 60_000) {
      this.socketRateLimit.set(socketId, { count: 1, timestamp: now });
      return;
    }

    existing.count++;

    if (existing.count > limit) {
      throw new WsException('Rate limit exceeded');
    }
  }
    */
}
