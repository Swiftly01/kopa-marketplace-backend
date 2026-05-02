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
import { emailVerificationStatus } from '../../../common/enums/email-verification-status.enum';

@Entity('email_verification_logs')
@Index(['userId', 'createdAt'])
@Index(['token'])
export class EmailVerificationLog {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  /**
   * The verification token sent to user
   */
  @Column({ type: 'varchar', length: 255 })
  token!: string;

  /**
   * Email address to be verified
   */
  @Column({ type: 'varchar', length: 255 })
  email!: string;

  @Column({
    type: 'enum',
    enum: emailVerificationStatus,
    default: emailVerificationStatus.PENDING,
  })
  status!: string;

  @Column({ name: 'verified_at', type: 'timestamp', nullable: true })
  verifiedAt!: Date;

  @Column({ name: 'expires_at', type: 'timestamp', nullable: true })
  expiresAt!: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
