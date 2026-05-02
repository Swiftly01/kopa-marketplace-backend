import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  Index,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';

export enum AuthProvider {
  GOOGLE = 'google',
  APPLE = 'apple',
  GITHUB = 'github',
}

@Entity('oauth_accounts')
@Index(['provider', 'providerId'], { unique: true }) // prevents duplicates
export class OAuthAccount {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({
    type: 'enum',
    enum: AuthProvider,
  })
  provider!: AuthProvider;

  // Google "sub" (unique ID from provider)
  @Column({ name: 'provider_id', type: 'varchar', length: 255 })
  providerId!: string;

  @Column({ type: 'varchar', length: 255 })
  email!: string;

  @Column({ name: 'profile_picture', type: 'text', nullable: true })
  profilePicture!: string | null;

  @ManyToOne(() => User, (user) => user.oauthAccounts, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ name: 'user_id' })
  userId!: string;

  @Column({ name: 'last_login_at', type: 'timestamp', nullable: true })
  lastLoginAt!: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
