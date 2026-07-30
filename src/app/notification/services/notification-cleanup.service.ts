import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Notification } from '../entities/notification.entity';
import { Repository } from 'typeorm';
import { AppLogger } from '../../logger/logger.service';
import { NotificationStatus } from '../enums/notification-status.enum';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class NotificationCleanupService implements OnModuleInit {
  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
    private readonly logger: AppLogger,
  ) {}

  async onModuleInit() {
    await this.cleanupSkippedNotifications();
  }

  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async cleanupSkippedNotifications(): Promise<void> {
    const result = await this.notificationRepository.delete({
      status: NotificationStatus.SKIPPED,
    });

    if (result.affected && result.affected > 0) {
      this.logger.log(`Cleaned up ${result.affected} skipped notification`);
    }
  }
}
