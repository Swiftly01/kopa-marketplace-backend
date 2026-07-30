import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../../auth/auth.module';
import { ChatModule } from '../chat/chat.module';
import { ChatParticipant } from '../chat/entities/chat-participant.entity';
import { Message } from './entities/message.entity';
import { MessageController } from './message.controller';
import { MessagesService } from './messages.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Message, ChatParticipant]),
    AuthModule,
    forwardRef(() => ChatModule),
  ],
  controllers: [MessageController],
  providers: [MessagesService],
  exports: [MessagesService],
})
export class MessagesModule {}
