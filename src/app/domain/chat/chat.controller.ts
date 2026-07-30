import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';

import { ChatService } from './chat.service';
import { CreateConversationDto } from './dtos/create-conversation.dto';

import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { JwtUser } from '../../common/types/request-with-user.interface';
import { AddParticipantDto } from './dtos/add-participant.dto';
import { ConversationQueryDto } from './dtos/conversationQuery.dto';
import { UpdateConversationDto } from './dtos/update-conversation.dto';

@UseGuards(JwtAuthGuard)
@Controller('conversations')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateConversationDto, @CurrentUser() user: JwtUser) {
    return this.chatService.createConversation(dto, user.id);
  }

  @Get()
  findAll(
    @Query() pagination: ConversationQueryDto,
    @CurrentUser() user: JwtUser,
  ) {
    return this.chatService.getUserConversations(user.id, pagination);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.chatService.findConversationById(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateConversationDto,
    @CurrentUser() user: JwtUser,
  ) {
    return this.chatService.updateConversation(id, dto, user.id);
  }

  @Post(':id/participants')
  @HttpCode(HttpStatus.CREATED)
  addParticipant(
    @Param('id') id: string,
    @Body() dto: AddParticipantDto,
    @CurrentUser() requester: JwtUser,
  ) {
    return this.chatService.addParticipant(id, dto.userId, requester.id);
  }

  @Delete(':id/participants/:userId')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeParticipant(
    @Param('id') id: string,
    @Param('userId') userId: string,
    @CurrentUser() requester: JwtUser,
  ) {
    return this.chatService.removeParticipant(id, userId, requester.id);
  }

  @Patch(':id/read')
  @HttpCode(HttpStatus.NO_CONTENT)
  markRead(@Param('id') id: string, @CurrentUser() user: JwtUser) {
    return this.chatService.markAsRead(id, user.id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string, @CurrentUser() user: JwtUser) {
    return this.chatService.deleteConversation(id, user.id);
  }
}
