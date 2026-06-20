import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { PromotionClaim } from './promotion-claim.entity';

export enum PromotionAssetType {
  PDF = 'pdf',
  VIDEO = 'video',
  LINK = 'link',
}

export enum PromotionStatus {
  ACTIVE = 'active',
  PAUSED = 'paused',
  ENDED = 'ended',
}

@Entity('promotions')
export class Promotion {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', nullable: true })
  name!: string;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  /**
   * Maximum number of users who can claim this promotion.
   * null = unlimited
   */
  @Column({ name: 'slot_limit', type: 'integer', nullable: true })
  slotLimit!: number | null;

  @Column({ name: 'asset_url', type: 'varchar', length: 2048, nullable: true })
  assetUrl!: string | null;

  @Column({
    name: 'asset_type',
    type: 'enum',
    enum: PromotionAssetType,
    default: PromotionAssetType.PDF,
  })
  assetType!: PromotionAssetType;

  @Column({
    type: 'enum',
    enum: PromotionStatus,
    default: PromotionStatus.ACTIVE,
  })
  status!: PromotionStatus;

  /**
   * Optional window: promo only valid between these dates
   */

  @Column({ name: 'starts_at', type: 'timestamp', nullable: true })
  startsAt!: Date | null;

  @Column({ name: 'ends_at', type: 'timestamp', nullable: true })
  endsAt!: Date | null;

  @OneToMany(() => PromotionClaim, (claim) => claim.promotion)
  claims!: PromotionClaim[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
