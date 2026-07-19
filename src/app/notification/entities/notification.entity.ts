import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  DeleteDateColumn,
} from 'typeorm';
import { NotificationChannel } from '../enums/notification-channel.enum';
import { NotificationType } from '../enums/notification-type.enum';
import { NotificationStatus } from '../enums/notification-status.enum';
import { NotificationPriority } from '../enums/notification-priority.enum';

@Entity('notifications')
@Index(['userId', 'createdAt'])
@Index(['status'])
@Index(['idempotencyKey', 'channel'], { unique: true })
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @Column({ type: 'varchar' })
  channel!: NotificationChannel;

  @Column({ type: 'varchar' })
  type!: NotificationType;

  @Column({ type: 'varchar', default: NotificationStatus.PENDING })
  status!: NotificationStatus;

  @Column({ type: 'int', default: NotificationPriority.NORMAL })
  priority!: NotificationPriority;

  @Column({ type: 'varchar', length: 255, nullable: true })
  title!: string | null;

  @Column({ type: 'text', nullable: true })
  body!: string | null;

  @Column({ type: 'jsonb', nullable: true })
  data!: Record<string, unknown> | null;

  @Column({ name: 'idempotency_key', type: 'varchar', length: 255 })
  idempotencyKey!: string;

  @Column({ name: 'provider_message_id', type: 'varchar', nullable: true })
  providerMessageId!: string | null;

  @Column({ name: 'provider_name', type: 'varchar', nullable: true })
  providerName!: string | null;

  @Column({ type: 'int', default: 0 })
  attempts!: number;

  @Column({ name: 'last_error', type: 'text', nullable: true })
  lastError!: string | null;

  @Column({ name: 'scheduled_for', type: 'timestamp', nullable: true })
  scheduledFor!: Date | null;

  @Column({ name: 'sent_at', type: 'timestamp', nullable: true })
  sentAt!: Date | null;

  @Column({ name: 'is_read', type: 'boolean', default: false })
  isRead!: boolean;

  @Column({ name: 'read_at', type: 'timestamp', nullable: true })
  readAt!: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt?: Date;
}
