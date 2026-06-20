import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Promotion } from './promotion.entity';

@Entity('promotion_claims')
export class PromotionClaim {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Promotion, (promo) => promo.claims, { onDelete: 'CASCADE' })
  promotion!: Promotion;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  user!: User;

  /**
   * The user's position in the promotion (1-based).
   * e.g. slotNumber = 7 means "you were the 7th person to claim"
   * Determined atomically via DB sequence to prevent race conditions.
   */

  @Column({ name: 'slot_number', type: 'integer' })
  slotNumber!: number;

  /**
   * The asset URL delivered to this user at claim time.
   * Stored so future URL rotations don't break past claims.
   */
  @Column({ name: 'asset_url', type: 'varchar', length: 2048, nullable: true })
  assetUrl!: string | null;

  @CreateDateColumn({ name: 'claimed_at' })
  claimedAt!: Date;
}
