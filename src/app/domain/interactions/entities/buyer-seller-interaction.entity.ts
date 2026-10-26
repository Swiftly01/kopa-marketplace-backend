import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Product } from '../../products/entities/product.entity';
import { Listing } from '../../listings/entities/listing.entity';
import { InteractionType } from '../enums/interaction-type.enum';

@Entity('buyer_seller_interactions')
@Check(
  'chk_interactions_one_target',
  `("product_id" IS NOT NULL) <> ("listing_id" IS NOT NULL)`,
)
@Index('idx_interaction_eligibility', ['buyerId', 'sellerId', 'productId'])
@Index(['listingId'])
@Index(['sellerId'])
@Index(['productId'])
@Index(['createdAt'])
export class BuyerSellerInteraction {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'buyer_id' })
  buyer!: User;

  @Column({ name: 'buyer_id', type: 'uuid' })
  buyerId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'seller_id' })
  seller!: User;

  @Column({ name: 'seller_id', type: 'uuid' })
  sellerId!: string;

  @ManyToOne(() => Product, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'product_id' })
  product!: Product | null;

  @Column({ name: 'product_id', type: 'uuid', nullable: true })
  productId!: string | null;

  @ManyToOne(() => Listing, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'listing_id' })
  listing!: Listing | null;

  // exactly one of productId / listingId is set (enforced by a CHECK constraint)
  @Column({ name: 'listing_id', type: 'uuid', nullable: true })
  listingId!: string | null;

  @Column({ type: 'enum', enum: InteractionType, name: 'type' })
  type!: InteractionType;

  @Column({ name: 'review_request_job_id', type: 'varchar', nullable: true })
  reviewRequestJobId!: string | null;

  @Column({
    name: 'review_request_scheduled_for',
    type: 'timestamp',
    nullable: true,
  })
  reviewRequestScheduledFor!: Date | null;

  @Column({
    name: 'review_request_sent_at',
    type: 'timestamp',
    nullable: true,
  })
  reviewRequestSentAt!: Date | null;

  @Column({ name: 'review_request_attempts', type: 'int', default: 0 })
  reviewRequestAttempts!: number;

  @Column({
    name: 'review_request_last_attempt_at',
    type: 'timestamp',
    nullable: true,
  })
  reviewRequestLastAttemptAt!: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
