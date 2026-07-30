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
import { MessageType } from '../enums/message-type';
import { MessageStatus } from '../enums/message-status';
import { Conversation } from '../../chat/entities/conversation.entity';
import { User } from '../../users/entities/user.entity';

@Entity('messages')
@Index(['conversationId', 'createdAt'])
export class Message {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  conversationId!: string;

  @Column()
  senderId!: string;

  @Column({ type: 'text', nullable: true })
  content?: string | null;

  @Column({ type: 'enum', enum: MessageType, default: MessageType.TEXT })
  type!: MessageType;

  @Column({ type: 'enum', enum: MessageStatus, default: MessageStatus.SENT })
  status!: MessageStatus;

  @Column({ type: 'varchar', nullable: true })
  mediaUrl?: string | null;

  @Column({ type: 'varchar', nullable: true })
  fileName?: string | null;

  @Column({ nullable: true })
  replyToId!: string;

  @Column({ type: 'timestamptz', nullable: true })
  deletedAt!: Date;

  @Column({ default: false })
  isEdited!: boolean;

  @ManyToOne(() => Conversation, (conv) => conv.messages, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'conversationId' })
  conversation!: Conversation;

  @ManyToOne(() => User, (user) => user.sentMessages, { eager: true })
  @JoinColumn({ name: 'senderId' })
  sender!: User;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
