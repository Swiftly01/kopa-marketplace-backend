import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { SendMessageDto } from './dtos/send-message.dto';
import { Message } from './entities/message.entity';
import { MessageStatus } from './enums/message-status';
import { MessageType } from './enums/message-type';

import { UpdateMessageDto } from './dtos/update-message.dto';

import { PaginationProvider } from '../../common/pagination/providers/pagination.provider';
import { QueryFilterProvider } from '../../common/providers/query-filter-provider';
import { AppLogger } from '../../logger/logger.service';
import { ChatParticipant } from '../chat/entities/chat-participant.entity';
import { UnreadCountRow } from './types/types';
import { ConversationQueryDto } from '../chat/dtos/conversationQuery.dto';

@Injectable()
export class MessagesService {
  constructor(
    @InjectRepository(Message)
    private readonly messageRepo: Repository<Message>,
    @InjectRepository(ChatParticipant)
    private readonly participantRepo: Repository<ChatParticipant>,
    private readonly queryFilterProvider: QueryFilterProvider,
    private readonly paginateProvider: PaginationProvider,
    private readonly logger: AppLogger,
  ) {}

  async createMessage(
    dto: SendMessageDto & { senderId: string },
  ): Promise<Message> {
    const message = this.messageRepo.create({
      conversationId: dto.conversationId,
      senderId: dto.senderId,
      content: dto.content,
      type: dto.type || MessageType.TEXT,
      mediaUrl: dto.mediaUrl,
      fileName: dto.fileName,
      replyToId: dto.replyToId,
      status: MessageStatus.SENT,
    });

    const saved = await this.messageRepo.save(message);
    this.logger.log(
      `Message ${saved.id} created in conversation ${dto.conversationId}`,
    );

    // `save()` does not populate eager relations (e.g. `sender`) unless
    // they were already loaded on the entity passed in — it only echoes
    // back what was set (here, just `senderId`). Consumers (REST response,
    // socket broadcast) render `message.sender.*`, so reload with the
    // relation attached rather than returning the bare saved entity.
    const withSender = await this.messageRepo.findOneBy({ id: saved.id });
    return withSender ?? saved;
  }

  async getConversationMessages(
    conversationId: string,
    query: ConversationQueryDto,
    baseUrl?: string,
  ) {
    let qb = this.messageRepo
      .createQueryBuilder('message')
      .leftJoinAndSelect('message.sender', 'sender')
      .where('message.conversationId = :conversationId', {
        conversationId,
      })
      .andWhere('message.deletedAt IS NULL');

    qb = this.queryFilterProvider.applyFilters(qb, query, {
      alias: 'message',

      // Optional: enable searching message content
      searchableFields: ['content'],

      allowedSortFields: ['createdAt'],

      sortMap: {
        newest: {
          field: 'createdAt',
          order: 'DESC',
        },
        oldest: {
          field: 'createdAt',
          order: 'ASC',
        },
      },

      dateField: 'createdAt',
    });

    // Default ordering
    if (!query.sortOrder) {
      qb.orderBy('message.createdAt', 'DESC');
    }

    return this.paginateProvider.paginateQuery(qb, query, baseUrl);
  }

  async findById(id: string): Promise<Message> {
    const msg = await this.messageRepo.findOne({
      where: { id, deletedAt: IsNull() },
      relations: ['sender'],
    });

    if (!msg) throw new NotFoundException(`Message ${id} not found`);
    return msg;
  }

  async updateMessage(
    id: string,
    dto: UpdateMessageDto,
    requesterId: string,
  ): Promise<Message> {
    const message = await this.findById(id);

    if (message.senderId !== requesterId) {
      throw new ForbiddenException('You can only edit your own messages');
    }

    if (message.type !== MessageType.TEXT) {
      throw new ForbiddenException('Only text messages can be edited');
    }

    message.content = dto.content;
    message.isEdited = true;
    return this.messageRepo.save(message);
  }

  async deleteMessage(id: string, requesterId: string): Promise<void> {
    const message = await this.findById(id);

    if (message.senderId !== requesterId) {
      throw new ForbiddenException('You can only delete your own messages');
    }

    message.content = null;
    message.mediaUrl = null;
    await this.messageRepo.save(message);
  }

  async markDelivered(id: string): Promise<void> {
    const message = await this.findById(id);

    if (message.status === MessageStatus.SENT) {
      await this.messageRepo.update(id, {
        status: MessageStatus.DELIVERED,
      });
    }
  }

  async markRead(id: string): Promise<void> {
    await this.messageRepo.update(id, {
      status: MessageStatus.READ,
    });
  }

  async getUnreadCounts(userId: string) {
    const rows = await this.participantRepo
      .createQueryBuilder('cp')
      .leftJoin(
        Message,
        'msg',
        `
  "msg"."conversationId" = "cp"."conversationId"
  AND "msg"."senderId" != :userId
  AND "msg"."deletedAt" IS NULL
  AND (
    "cp"."lastReadAt" IS NULL
    OR "msg"."createdAt" > "cp"."lastReadAt"
  )
  `,
        { userId },
      )
      .select('cp.conversationId', 'conversationId')
      .addSelect('COUNT(msg.id)', 'unreadCount')
      .where('cp.userId = :userId', { userId })
      .groupBy('cp.conversationId')
      .getRawMany<UnreadCountRow>();

    return rows.map((row) => ({
      conversationId: row.conversationId,
      unreadCount: Number(row.unreadCount),
    }));
  }
}
