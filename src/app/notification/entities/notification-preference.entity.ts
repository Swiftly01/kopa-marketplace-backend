import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { NotificationChannel } from '../enums/notification-channel.enum';

@Entity('notification_preferences')
@Index(['userId', 'channel'], { unique: true })
export class NotificationPreference {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @Column({ type: 'varchar' })
  channel!: NotificationChannel;

  @Column({ type: 'boolean', default: true })
  enabled!: boolean;

  @Column({ type: 'varchar', default: 'Africa/Lagos' })
  timezone!: string;

  @Column({ name: 'quiet_hours_start', type: 'varchar', nullable: true })
  quietHoursStart!: string | null;

  @Column({ name: 'quiet_hours_end', type: 'varchar', nullable: true })
  quietHoursEnd!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
