import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ConversationType } from '../enums/conversation-type';
import { ChatParticipant } from './chat-participant.entity';
import { MessageType } from '../../messages/enums/message-type';
import { Message } from '../../messages/entities/message.entity';

@Entity('conversations')
export class Conversation {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({
    type: 'enum',
    enum: ConversationType,
    default: ConversationType.DIRECT,
  })
  type!: ConversationType;

  @Column({ nullable: true })
  name!: string;

  @Column({ type: 'text', nullable: true })
  lastMessagePreview!: string;

  @Column({ type: 'timestamptz', nullable: true })
  lastMessageAt!: Date;

  @Column({ type: 'varchar', nullable: true })
  lastMessageMediaUrl!: string | null;

  @Column({ type: 'varchar', nullable: true })
  lastMessageFileName!: string | null;

  @Column({ type: 'enum', enum: MessageType, nullable: true })
  lastMessageType!: MessageType | null;

  @Column({ default: true })
  isActive!: boolean;

  @OneToMany(() => ChatParticipant, (cp) => cp.conversation, { cascade: true })
  participants!: ChatParticipant[];

  @OneToMany(() => Message, (msg) => msg.conversation)
  messages!: Message[];

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
