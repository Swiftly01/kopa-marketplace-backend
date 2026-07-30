import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { CallType } from './enums/call-type.enum';
import { CallStatus } from './enums/call-status.enum';
import { User } from '../users/entities/user.entity';

@Entity('call_sessions')
@Index(['callerId', 'createdAt'])
@Index(['calleeId', 'createdAt'])
export class CallSession {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  callerId!: string;

  @Column()
  calleeId!: string;

  @Column({ type: 'enum', enum: CallType })
  type!: CallType;

  @Column({ type: 'enum', enum: CallStatus, default: CallStatus.INITIATED })
  status!: CallStatus;

  @Column({ type: 'timestamptz', nullable: true })
  startedAt!: Date;

  @Column({ type: 'timestamptz', nullable: true })
  endedAt!: Date;

  @Column({ nullable: true })
  durationSeconds!: number;

  @Column({ nullable: true })
  conversationId!: string;

  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'callerId' })
  caller!: User;

  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'calleeId' })
  callee!: User;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
