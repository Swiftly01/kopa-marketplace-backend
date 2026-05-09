import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from './user.entity';
import { OTPType } from '../../../common/enums/otp-type-enum';
import { OTPDeliveryChannel } from '../../../common/enums/otp-delivery-method';

@Entity('otp_logs')
@Index(['userId', 'createdAt'])
@Index(['userId', 'type'])
export class OtpLog {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  /**
   * User ID for easier querying
   */
  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @Column({
    type: 'enum',
    enum: OTPType,
  })
  type!: string;

  @Column({
    name: 'delivery_channel',
    type: 'enum',
    enum: OTPDeliveryChannel,
    default: OTPDeliveryChannel.EMAIL,
  })
  deliveryChannel!: string;

  /**
   * Recipient of OTP (email address or phone number)
   */
  @Column({ type: 'varchar', length: 255 })
  recipient!: string;

  @Column({ name: 'ip_address', type: 'varchar', length: 50, nullable: true })
  ipAddress!: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
