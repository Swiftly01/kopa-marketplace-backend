import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { PaginationProvider } from '../../common/pagination/providers/pagination.provider';
import { NotificationQueryDto } from '../dtos/notification-query.dto';
import { SendNotificationDto } from '../dtos/send-notification.dto';
import { Notification } from '../entities/notification.entity';
import { NotificationProducerService } from './notification-producer.service';
import { NotificationStatus } from '../enums/notification-status.enum';
import { RecipientBatchNotificationService } from './recipient-batch-notification.service';
import { RecipientBatchService } from './recipient-batch.service';
import { RecipientSelectionService } from './recipient-selection.service';
import { SendNotificationBatchDto } from '../dtos/send-notification-batch.dto';
import { BatchFeature } from '../enums/batch-feature.enum';
import { FilterUsersDto } from '../../domain/admin/dtos/filter-users-dto';

const USER_VISIBLE_STATUSES = [NotificationStatus.SENT];

@Injectable()
export class NotificationService {
  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
    private readonly producer: NotificationProducerService,
    private readonly paginationProvider: PaginationProvider,
    private readonly recipientBatchNotification: RecipientBatchNotificationService,
    private readonly recipientBatchService: RecipientBatchService,
    private readonly recipientSelectionService: RecipientSelectionService,
  ) {}

  send(dto: SendNotificationDto) {
    return this.producer.send(dto);
  }

  sendBulk(dtos: SendNotificationDto[]) {
    return this.producer.sendBulk(dtos);
  }

  sendToBatch(dto: SendNotificationBatchDto, adminId: string) {
    return this.recipientBatchNotification.sendToRecipients({
      feature: BatchFeature.NOTIFICATION,
      adminId,
      userIds: dto.userIds,
      campaignId: dto.batchKey,
      buildDto: (userId, campaignId) => ({
        userId,
        type: dto.type,
        title: dto.title,
        body: dto.body,
        html: dto.html,
        data: dto.data,
        channels: dto.channels,
        priority: dto.priority,
        scheduledFor: dto.scheduledFor,
        idempotencyKey: `notification_${campaignId}_${userId}`,
      }),
    });
  }

  searchRecipients(
    feature: BatchFeature,
    adminId: string,
    query: FilterUsersDto,
    baseUrl?: string,
  ) {
    return this.recipientSelectionService.search(
      feature,
      adminId,
      query,
      baseUrl,
    );
  }

  getActiveBatches(feature: BatchFeature, adminId: string) {
    return this.recipientBatchService.getActiveBatches(feature, adminId);
  }

  async findForUser(userId: string, query: NotificationQueryDto) {
    const qb = this.notificationRepository
      .createQueryBuilder('notification')
      .where('notification.user_id = :userId', {
        userId,
      })
      .orderBy('notification.created_at', 'DESC');

    if (query.channel) {
      qb.andWhere('notification.channel = :channel', {
        channel: query.channel,
      });
    }
    if (query.status) {
      qb.andWhere('notification.status = :status', {
        status: query.status,
      });
    } else {
      qb.andWhere('notification.status IN (:...statuses)', {
        statuses: USER_VISIBLE_STATUSES,
      });
    }

    return this.paginationProvider.paginateQuery(qb, query);
  }

  async findOneForUser(userId: string, id: string): Promise<Notification> {
    const notification = await this.notificationRepository.findOne({
      where: { id, userId },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    return notification;
  }

  async getUnreadCount(userId: string): Promise<{ count: number }> {
    const count = await this.notificationRepository.count({
      where: {
        userId,
        readAt: IsNull(),
        status: USER_VISIBLE_STATUSES[0],
      },
    });
    return {
      count,
    };
  }

  async markAsRead(userId: string, id: string): Promise<Notification> {
    const notification = await this.findOneForUser(userId, id);
    if (!notification.readAt) {
      notification.readAt = new Date();
      await this.notificationRepository.save(notification);
    }
    return notification;
  }

  async markAsUnread(userId: string, id: string): Promise<Notification> {
    const notification = await this.findOneForUser(userId, id);
    if (notification.readAt) {
      notification.readAt = null;
      await this.notificationRepository.save(notification);
    }
    return notification;
  }

  async markAllAsRead(userId: string): Promise<{ updated: number }> {
    const result = await this.notificationRepository
      .createQueryBuilder()
      .update(Notification)
      .set({ readAt: new Date() })
      .where('user_id = :userId', { userId })
      .andWhere('read_at IS NULL')
      .execute();

    return { updated: result.affected ?? 0 };
  }

  async remove(userId: string, id: string): Promise<void> {
    await this.findOneForUser(userId, id);
    await this.notificationRepository.softDelete({ id, userId });
  }
}
