import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ParticipantRole } from '../enums/participant-role';
import { Conversation } from './conversation.entity';
import { User } from '../../users/entities/user.entity';
@Index(['conversationId', 'userId'], { unique: true })
@Entity('chat_participants')
export class ChatParticipant {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  conversationId!: string;

  @Column()
  userId!: string;

  @Column({
    type: 'enum',
    enum: ParticipantRole,
    default: ParticipantRole.MEMBER,
  })
  role!: ParticipantRole;

  @Column({ type: 'timestamptz', nullable: true })
  lastReadAt!: Date;

  @Column({ default: false })
  isMuted!: boolean;

  @Column({ type: 'timestamptz', nullable: true })
  leftAt?: Date | null;

  // Relations
  @ManyToOne(() => Conversation, (conv) => conv.participants, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'conversationId' })
  conversation!: Conversation;

  @ManyToOne(() => User, (user) => user.chatParticipants, { eager: true })
  @JoinColumn({ name: 'userId' })
  user!: User;

  @CreateDateColumn({ type: 'timestamptz' })
  joinedAt!: Date;
}
