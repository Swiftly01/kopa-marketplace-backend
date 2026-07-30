import { forwardRef, Module } from '@nestjs/common';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { ChatGateway } from './chat.gateway';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Conversation } from './entities/conversation.entity';
import { ChatParticipant } from './entities/chat-participant.entity';
import { UserModule } from '../users/user.module';
import { AuthModule } from '../../auth/auth.module';
import { MessagesModule } from '../messages/messages.module';
import { ChatPresenceService } from './presence/chat-presence.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Conversation, ChatParticipant]),
    UserModule,
    AuthModule,
    forwardRef(() => MessagesModule),
  ],
  controllers: [ChatController],
  providers: [ChatService, ChatGateway, ChatPresenceService],
  exports: [ChatService],
})
export class ChatModule {}
