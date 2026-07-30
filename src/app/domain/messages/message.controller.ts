import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';

import { MessagesService } from './messages.service';

import { SendMessageDto } from './dtos/send-message.dto';
import { UpdateMessageDto } from './dtos/update-message.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ChatService } from '../chat/chat.service';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { JwtUser } from '../../common/types/request-with-user.interface';
import { ConversationQueryDto } from '../chat/dtos/conversationQuery.dto';

@UseGuards(JwtAuthGuard)
@Controller()
export class MessageController {
  constructor(
    private readonly messagesService: MessagesService,
    private readonly chatService: ChatService,
  ) {}

  @Get('messages/unread-messages')
  getUnreadMessages(@CurrentUser() user: JwtUser) {
    return this.messagesService.getUnreadCounts(user.id);
  }

  @Get('conversations/:conversationId/messages')
  async getMessages(
    @Param('conversationId', ParseUUIDPipe) conversationId: string,
    @Query() query: ConversationQueryDto,
    @CurrentUser() user: JwtUser,
  ) {
    await this.chatService.assertParticipant(conversationId, user.id);
    return this.messagesService.getConversationMessages(conversationId, query);
  }

  @Post('messages')
  @HttpCode(HttpStatus.CREATED)
  async sendMessage(
    @Body() dto: SendMessageDto,
    @CurrentUser() sender: JwtUser,
  ) {
    await this.chatService.assertParticipant(dto.conversationId, sender.id);
    const message = await this.messagesService.createMessage({
      ...dto,
      senderId: sender.id,
    });

    await this.chatService.updateLastMessage(
      dto.conversationId,
      dto.content || '[attachment]',
      dto.mediaUrl,
      dto.fileName,
      dto.type,
    );
    return message;
  }

  @Get('messages/:id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.messagesService.findById(id);
  }

  @Patch('messages/:id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateMessageDto,
    @CurrentUser() user: JwtUser,
  ) {
    return this.messagesService.updateMessage(id, dto, user.id);
  }
  @Delete('messages/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: JwtUser) {
    return this.messagesService.deleteMessage(id, user.id);
  }
}
