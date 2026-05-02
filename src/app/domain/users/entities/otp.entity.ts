import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';

export enum OtpPurpose {
  EMAIL_VERIFICATION = 'email_verification',
  PASSWORD_RESET = 'password_reset',
}

@Entity('otps')
export class Otp {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  code!: string; // hashed OTP

  @Column({
    type: 'enum',
    enum: OtpPurpose,
  })
  purpose!: OtpPurpose;

  @Column({ default: false })
  isUsed!: boolean;

  @Column()
  expiresAt!: Date;

  @Column({ default: 0 })
  attempts!: number;

  @Column({ default: false })
  isBlocked!: boolean;

  @ManyToOne(() => User, (user) => user.otps, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @CreateDateColumn()
  createdAt!: Date;
}
