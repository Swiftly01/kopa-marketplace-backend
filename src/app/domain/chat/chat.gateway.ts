import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  WsException,
} from '@nestjs/websockets';
import { Server } from 'socket.io';
import { ChatService } from './chat.service';
import { AppSocket } from './types/socket.types';
import { MessagesService } from '../messages/messages.service';
import { UserService } from '../users/user.service';
import { ChatStatus } from '../../common/enums/user-status.enum';
import { SendMessageDto } from '../messages/dtos/send-message.dto';
import { TypingDto } from '../messages/dtos/typing.dto';
import { ChatPresenceService } from './presence/chat-presence.service';

@WebSocketGateway({
  cors: { origin: '*', credentials: true },
  namespace: '/',
  transports: ['websocket', 'polling'],
})
export class ChatGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server!: Server;

  // private userSockets: Map<string, Set<string>> = new Map();
  private readonly logger = new Logger(ChatGateway.name);

  constructor(
    private readonly chatService: ChatService,
    private readonly messagesService: MessagesService,
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly presenceService: ChatPresenceService,
  ) {}

  afterInit(server: Server) {
    console.log(server);
    this.logger.log(`ChatGateway initialised`);
  }

  async handleConnection(client: AppSocket) {
    this.logger.log('Socket attempting connection');

    console.log('AUTH:', client.handshake.auth);
    console.log('HEADERS:', client.handshake.headers);
    try {
      const rawToken: string =
        (client.handshake.auth?.token as string) ||
        (client.handshake.headers?.authorization as string) ||
        '';

      const token = rawToken.startsWith('Bearer ')
        ? rawToken.slice(7)
        : rawToken;

      if (!token) {
        client.emit('error', {
          message: 'Authentication token is required',
        });
        client.disconnect(true);
        return;
      }

      const payload = this.jwtService.verify<{ sub: string; email: string }>(
        token,
        {
          secret: this.configService.get<string>('app.jwtSecret'),
        },
      );

      const user = await this.userService.getUserProfile(payload.sub);

      // Attach resolved user to socket data for use in event handlers
      client.data.userId = user.id;
      client.data.user = user;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';

      this.logger.warn(
        `Connection rejected - invalid token: ${client.id} (${message})`,
      );

      client.emit('error', {
        message: 'Invalid or expired token',
      });

      client.disconnect(true);
      return;
    }

    const userId = client.data.userId;

    // Track socket: user mapping on the socket itself
    client.data.userId = userId;

    await this.presenceService.addSocket(userId, client.id);

    // Register socket in the userSockets map
    /*FF
    if (!this.userSockets.has(userId)) {
      this.userSockets.set(userId, new Set());
    }
    this.userSockets.get(userId)?.add(client.id);
    */
    // Join personal notification room
    await client.join(`user:${userId}`);

    await this.userService.updateUserStatus(userId, ChatStatus.ONLINE);

    // Notify participants that this user came online
    this.server.emit('user_status_changed', {
      userId,
      status: ChatStatus.ONLINE,
    });

    this.logger.log(`User ${userId} connected (socket: ${client.id})`);
  }

  async handleDisconnect(client: AppSocket) {
    const userId = client.data.userId;
    if (!userId) return;

    const remaining = await this.presenceService.removeSocket(
      userId,
      client.id,
    );

    if (remaining === 0) {
      await this.userService.updateUserStatus(userId, ChatStatus.OFFLINE);
      this.server.emit('user_status_changed', {
        userId,
        status: ChatStatus.OFFLINE,
      });
      this.logger.log(`User ${userId} is now offline`);
    }

    /*
    const sockets = this.userSockets.get(userId);

    if (sockets) {
      sockets.delete(client.id);
      if (sockets.size === 0) {
        this.userSockets.delete(userId);
        await this.userService.updateUserStatus(userId, ChatStatus.OFFLINE);
        this.server.emit('user_status_changed', {
          userId,
          status: ChatStatus.OFFLINE,
        });
        this.logger.log(`User ${userId} is now offline`);
      }
    }
      */

    this.logger.log(`Socket ${client.id} disconnected`);
  }

  @SubscribeMessage('join_conversation')
  async handleJoinConverstion(
    @MessageBody() data: { conversationId: string },
    @ConnectedSocket() client: AppSocket,
  ) {
    const userId = client.data.userId;

    try {
      await this.chatService.assertParticipant(data.conversationId, userId);
    } catch {
      throw new WsException('You are not a participant of this conversation');
    }

    const room = `conversation:${data.conversationId}`;
    await client.join(room);
    this.logger.log(`User ${userId} joined room ${room}`);

    return {
      event: 'joined_conversation',
      conversationId: data.conversationId,
    };
  }

  @SubscribeMessage('leave_conversation')
  async handleLeaveConversation(
    @MessageBody() data: { conversationId: string },
    @ConnectedSocket() client: AppSocket,
  ) {
    const room = `conversation:${data.conversationId}`;
    await client.leave(room);
    return { event: 'left_conversation', conversationId: data.conversationId };
  }

  @SubscribeMessage('send_message')
  async handleSendMessage(
    @MessageBody() dto: SendMessageDto,
    @ConnectedSocket() client: AppSocket,
  ) {
    const senderId = client.data.userId;

    try {
      await this.chatService.assertParticipant(dto.conversationId, senderId);
    } catch {
      throw new WsException('You are not a participant of this conversation');
    }

    const message = await this.messagesService.createMessage({
      ...dto,
      senderId,
    });

    await this.chatService.updateLastMessage(
      dto.conversationId,
      dto.content || `[${dto.type || 'file'}]`,
      dto.mediaUrl,
      dto.fileName,
      dto.type,
    );

    // Broadcast to all sockets in the conversation
    const room = `conversation:${dto.conversationId}`;
    this.server.to(room).emit('new_message', message);

    // Notify a user that is not in the room but was added as a participant as another user
    const conversation = await this.chatService.findConversationById(
      dto.conversationId,
    );
    for (const participant of conversation.participants) {
      if (participant.userId !== senderId) {
        this.notifyUser(participant.userId, 'new_message', message);
      }
    }

    this.logger.log(
      `Message ${message.id} sent in conversation ${dto.conversationId}`,
    );
    return message;
  }

  @SubscribeMessage('typing_start')
  async handleTyping(
    @MessageBody() dto: TypingDto,
    @ConnectedSocket() client: AppSocket,
  ) {
    const userId = client.data.userId;
    const user = await this.userService.getUserProfile(userId);

    const room = `conversation:${dto.conversationId}`;
    client.broadcast.to(room).emit('user_typing', {
      conversationId: dto.conversationId,
      userId,
      userName: user.firstName,
    });
  }

  @SubscribeMessage('typing_stop')
  handleStopTyping(
    @MessageBody() dto: TypingDto,
    @ConnectedSocket() client: AppSocket,
  ) {
    const userId = client.data.userId;

    const room = `conversation:${dto.conversationId}`;
    client.broadcast.to(room).emit('user_stopped_typing', {
      conversationId: dto.conversationId,
      userId,
    });
  }

  @SubscribeMessage('message_read')
  async handleMessageRead(
    @MessageBody() data: { conversationId: string },
    @ConnectedSocket() client: AppSocket,
  ) {
    const userId = client.data.userId;
    await this.chatService.markAsRead(data.conversationId, userId);

    const room = `conversation:${data.conversationId}`;
    this.server.to(room).emit('read_receipt', {
      conversationId: data.conversationId,
      userId,
      readAt: new Date().toISOString(),
    });
  }

  notifyUser(userId: string, event: string, data: any) {
    this.server.to(`user:${userId}`).emit(event, data);
  }

  notifyConversation(conversationId: string, event: string, data: any) {
    this.server.to(`conversation:${conversationId}`).emit(event, data);
  }

  async isUserOnline(userId: string): Promise<boolean> {
    // return (this.userSockets.get(userId)?.size ?? 0) > 0;
    return this.presenceService.isOnline(userId);
  }
}
