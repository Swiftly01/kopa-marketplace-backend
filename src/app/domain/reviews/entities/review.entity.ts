import {
  Check,
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Product } from '../../products/entities/product.entity';
import { BuyerSellerInteraction } from '../../interactions/entities/buyer-seller-interaction.entity';
import { ReviewStatus } from '../enums/review-status.enum';

@Entity('reviews')
@Index('idx_review_one_per_buyer_per_product', ['buyerId', 'productId'], {
  unique: true,
})
@Index(['sellerId'])
@Index(['productId'])
@Index(['status'])
@Check(`"rating" >= 1 AND "rating" <= 5`)
export class Review {
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

  @ManyToOne(() => Product, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'product_id' })
  product!: Product;

  @Column({ name: 'product_id', type: 'uuid' })
  productId!: string;

  @ManyToOne(() => BuyerSellerInteraction, {
    onDelete: 'SET NULL',
    nullable: true,
  })
  @JoinColumn({ name: 'interaction_id' })
  interaction!: BuyerSellerInteraction | null;

  @Column({ name: 'interaction_id', type: 'uuid', nullable: true })
  interactionId!: string | null;

  @Column({ type: 'smallint' })
  rating!: number;

  @Column({ type: 'text', nullable: true })
  comment!: string | null;

  @Column({
    type: 'enum',
    enum: ReviewStatus,
    default: ReviewStatus.PUBLISHED,
  })
  status!: ReviewStatus;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt!: Date | null;
}
