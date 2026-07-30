import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { ChatParticipant } from './entities/chat-participant.entity';
import { Conversation } from './entities/conversation.entity';

import { CreateConversationDto } from './dtos/create-conversation.dto';
import { ConversationType } from './enums/conversation-type';
import { ParticipantRole } from './enums/participant-role';

import { PaginationProvider } from '../../common/pagination/providers/pagination.provider';
import { QueryFilterProvider } from '../../common/providers/query-filter-provider';
import { AppLogger } from '../../logger/logger.service';
import { MessageType } from '../messages/enums/message-type';
import { UserService } from '../users/user.service';
import { ConversationQueryDto } from './dtos/conversationQuery.dto';
import { UpdateConversationDto } from './dtos/update-conversation.dto';

@Injectable()
export class ChatService {
  constructor(
    @InjectRepository(Conversation)
    private readonly conversationRepo: Repository<Conversation>,

    @InjectRepository(ChatParticipant)
    private readonly participantRepo: Repository<ChatParticipant>,

    private readonly userService: UserService,
    private readonly queryFilterProvider: QueryFilterProvider,
    private readonly paginateProvider: PaginationProvider,
    private readonly logger: AppLogger,
  ) {}

  async createConversation(
    dto: CreateConversationDto,
    creatorId: string,
  ): Promise<Conversation> {
    const type = dto.type || ConversationType.DIRECT;

    //Ensure participantIds includes the creator

    const allParticipantIds = [...new Set([creatorId, ...dto.participantIds])];

    //Validate all users exist
    await Promise.all(
      allParticipantIds.map((id) => this.userService.findById(id)),
    );

    if (type === ConversationType.DIRECT) {
      if (allParticipantIds.length !== 2) {
        throw new BadRequestException(
          'Direct conversations must have exactly 2 participants',
        );
      }

      // Return existing direct conversation if it exists
      const existing = await this.findExistingDirectConversation(
        allParticipantIds[0],
        allParticipantIds[1],
      );

      if (existing) {
        this.logger.log(
          `Returning existing direct conversation: ${existing.id}`,
        );
        return existing;
      }
    }

    if (type === ConversationType.GROUP && !dto.name) {
      throw new BadRequestException('Group conversations must have a name');
    }

    // Create conversation
    const conversation = this.conversationRepo.create({
      type,
      name: dto.name,
    });
    const savedConversation = await this.conversationRepo.save(conversation);

    // Add participants

    const participants = allParticipantIds.map((userId) =>
      this.participantRepo.create({
        conversationId: savedConversation.id,
        userId,
        // First participant becomes admin of group chats
        role:
          userId === creatorId && type === ConversationType.GROUP
            ? ParticipantRole.ADMIN
            : ParticipantRole.MEMBER,
      }),
    );

    await this.participantRepo.save(participants);

    this.logger.log(`Conversation created: ${savedConversation.id} (${type})`);

    return this.findConversationById(conversation.id);
  }

  async getUserConversations(
    userId: string,
    query: ConversationQueryDto,
    baseUrl?: string,
  ) {
    let qb = this.conversationRepo
      .createQueryBuilder('conv')
      .innerJoin(
        'conv.participants',
        'participant',
        'participant.userId = :userId AND participant.leftAt IS NULL',
        { userId },
      )
      .leftJoinAndSelect('conv.participants', 'cp')
      .leftJoinAndSelect('cp.user', 'user')
      .where('conv.isActive = true');

    qb = this.queryFilterProvider.applyFilters(qb, query, {
      alias: 'conv',

      searchableFields: ['name'],

      allowedSortFields: ['createdAt', 'lastMessageAt'],

      sortMap: {
        newest: {
          field: 'lastMessageAt',
          order: 'DESC',
        },
        oldest: {
          field: 'createdAt',
          order: 'ASC',
        },
      },

      dateField: 'createdAt',
    });

    if (!query.sortOrder) {
      qb.orderBy('conv.lastMessageAt', 'DESC', 'NULLS LAST').addOrderBy(
        'conv.createdAt',
        'DESC',
      );
    }

    return this.paginateProvider.paginateQuery(qb, query, baseUrl);
  }

  async assertParticipant(
    conversationId: string,
    userId: string,
  ): Promise<ChatParticipant> {
    const participant = await this.participantRepo.findOne({
      where: {
        conversationId,
        userId,
        leftAt: IsNull(),
      },
    });

    if (!participant) {
      throw new NotFoundException(
        'You are not a participant of this conversation',
      );
    }

    return participant;
  }

  async addParticipant(
    conversationId: string,
    userId: string,
    requesterId: string,
  ) {
    const conversation = await this.findConversationById(conversationId);

    if (conversation.type === ConversationType.DIRECT) {
      throw new BadRequestException(
        'Cannot add partcipants to a direct conversation',
      );
    }

    // Only admins can add participants to group chats
    const requester = await this.participantRepo.findOne({
      where: {
        conversationId,
        userId: requesterId,
      },
    });

    if (requester?.role !== ParticipantRole.ADMIN) {
      throw new ForbiddenException('Only group admins can add participants');
    }

    await this.userService.findById(userId);

    const existing = await this.participantRepo.findOne({
      where: {
        conversationId,
        userId,
      },
    });

    if (existing) {
      // Rejoin
      existing.leftAt = null;
      return this.participantRepo.save(existing);
    }

    const participant = this.participantRepo.create({
      conversationId,
      userId,
    });

    return this.participantRepo.save(participant);
  }

  async removeParticipant(
    conversationId: string,
    userId: string,
    requesterId: string,
  ): Promise<void> {
    await this.findConversationById(conversationId);

    const requester = await this.participantRepo.findOne({
      where: { conversationId, userId: requesterId },
    });

    // Users can leave themselves or admins can remove others

    const isSelf = userId === requesterId;

    if (!isSelf && requester?.role !== ParticipantRole.ADMIN) {
      throw new ForbiddenException('Only admins can remove other participants');
    }

    const partcipant = await this.assertParticipant(conversationId, userId);
    partcipant.leftAt = new Date();
    await this.participantRepo.save(partcipant);
  }

  async updateConversation(
    id: string,
    dto: UpdateConversationDto,
    requesterId: string,
  ) {
    const conversation = await this.findConversationById(id);
    await this.assertParticipant(id, requesterId);
    Object.assign(conversation, dto);

    await this.conversationRepo.save(conversation);
    return this.findConversationById(id);
  }

  async updateLastMessage(
    conversationId: string,
    preview: string,
    mediaUrl?: string | null,
    fileName?: string | null,
    type?: MessageType,
  ): Promise<void> {
    await this.conversationRepo.update(conversationId, {
      lastMessagePreview: preview.substring(0, 100),
      lastMessageAt: new Date(),
      lastMessageMediaUrl: mediaUrl ?? null,
      lastMessageFileName: fileName ?? null,
      lastMessageType: type ?? null,
    });
  }
  async markAsRead(conversationId: string, userId: string): Promise<void> {
    await this.assertParticipant(conversationId, userId);
    await this.participantRepo.update(
      { conversationId, userId },
      {
        lastReadAt: new Date(),
      },
    );
  }

  async getUnreadCount(
    conversationId: string,
    userId: string,
  ): Promise<number> {
    const participant = await this.assertParticipant(conversationId, userId);

    if (!participant.lastReadAt) {
      // Never read — count all messages not sent by this user
      return 0;
    }
    // This is resolved via MessagesService — placeholder returns 0 here
    return 0;
  }

  async findConversationById(id: string): Promise<Conversation> {
    const conversation = await this.conversationRepo
      .createQueryBuilder('conv')
      .leftJoinAndSelect('conv.participants', 'cp')
      .leftJoinAndSelect('cp.user', 'user')
      .where('conv.id = :id', { id })
      .andWhere('conv.isActive = true')
      .getOne();

    if (!conversation) {
      throw new NotFoundException(`Conversation ${id} not found`);
    }

    return conversation;
  }

  async deleteConversation(id: string, requesterId: string): Promise<void> {
    const conversation = await this.findConversationById(id);
    const participant = await this.assertParticipant(id, requesterId);

    if (conversation.type === ConversationType.GROUP) {
      if (participant.role !== ParticipantRole.ADMIN) {
        throw new ForbiddenException(
          'Only group admins can delete this conversation',
        );
      }
      await this.conversationRepo.update(id, { isActive: false });
      return;
    }

    // DIRECT: deleting only removes it from the requester's own view
    participant.leftAt = new Date();
    await this.participantRepo.save(participant);
  }

  private async findExistingDirectConversation(
    userAId: string,
    userBId: string,
  ): Promise<Conversation | null> {
    const result = await this.conversationRepo
      .createQueryBuilder('conv')
      .innerJoin(
        'conv.participants',
        'cpA',
        'cpA.userId = :userAId AND cpA.leftAt IS NULL',
        { userAId },
      )
      .innerJoin(
        'conv.participants',
        'cpB',
        'cpB.userId = :userBId AND cpB.leftAt IS NULL',
        { userBId },
      )
      .where('conv.type = :type', { type: ConversationType.DIRECT })
      .andWhere('conv.isActive = true')
      .getOne();

    return result || null;
  }
}
