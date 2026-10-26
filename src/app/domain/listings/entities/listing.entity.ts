import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Category } from '../../category/entities/category.entity';
import { User } from '../../users/entities/user.entity';
import { ListingStatus } from '../enums/listing-status.enum';
import { NegotiationStatus } from '../enums/negotiation-status.enum';
import { bigintTransformer } from '../utils/bigint.transformer';
import { ListingImage } from './listing-image.entity';

/**
 * Core listing record - the fields EVERY category shares (title, photos,
 * price, location...). Anything category-specific (bedrooms, mileage, ...)
 * lives in that category's own details table and is managed by its
 * ListingCategoryHandler. See ../categories.
 */
@Entity('listings')
@Index(['userId', 'status'])
@Index(['categoryId', 'status'])
@Index(['stateCode', 'lgaName'])
@Index(['status', 'publishedAt'])
export class Listing {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  /** Always a leaf category that has a registered handler. */
  @ManyToOne(() => Category, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'category_id' })
  category!: Category;

  @Column({ name: 'category_id', type: 'uuid' })
  categoryId!: string;

  @Column({ type: 'varchar', length: 100 })
  title!: string;

  @Column({ type: 'varchar', length: 160, unique: true })
  slug!: string;

  @Column({ type: 'text' })
  description!: string;

  /** Whole Naira (e.g. 1500000 = N1,500,000). */
  @Column({ type: 'bigint', transformer: bigintTransformer })
  price!: number;

  @Column({
    type: 'varchar',
    length: 20,
    default: NegotiationStatus.NOT_SURE,
  })
  negotiable!: NegotiationStatus;

  @Column({ name: 'video_url', type: 'varchar', length: 1024, nullable: true })
  videoUrl!: string | null;

  @Column({ name: 'state_code', type: 'varchar', length: 10 })
  stateCode!: string;

  @Column({ name: 'state_name', type: 'varchar', length: 100 })
  stateName!: string;

  /** The "locality" picked in the form (an LGA / town, e.g. Osogbo). */
  @Column({ name: 'lga_name', type: 'varchar', length: 100 })
  lgaName!: string;

  @Column({ type: 'varchar', length: 20, default: ListingStatus.DRAFT })
  status!: ListingStatus;

  @Column({ type: 'integer', default: 0 })
  views!: number;

  /** Average review rating (0 when there are no reviews). */
  @Column({ type: 'decimal', precision: 3, scale: 2, default: 0 })
  rating!: number | string;

  @Column({ name: 'review_count', type: 'integer', default: 0 })
  reviewCount!: number;

  @OneToMany(() => ListingImage, (image) => image.listing)
  images!: ListingImage[];

  /** Why an admin rejected the ad; cleared when it is resubmitted or approved. */
  @Column({ name: 'rejection_reason', type: 'text', nullable: true })
  rejectionReason!: string | null;

  /** When an admin last approved or rejected the ad. */
  @Column({ name: 'reviewed_at', type: 'timestamptz', nullable: true })
  reviewedAt!: Date | null;

  /** The admin who made that decision (no FK on purpose: audit data survives user deletion). */
  @Column({ name: 'reviewed_by', type: 'uuid', nullable: true })
  reviewedBy!: string | null;

  @Column({ name: 'published_at', type: 'timestamptz', nullable: true })
  publishedAt!: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @DeleteDateColumn({ name: 'deleted_at', nullable: true })
  deletedAt!: Date | null;
}
