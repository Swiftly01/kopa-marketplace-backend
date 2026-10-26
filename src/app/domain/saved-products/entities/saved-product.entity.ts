import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Product } from '../../products/entities/product.entity';
import { Listing } from '../../listings/entities/listing.entity';

@Entity('saved_products')
@Check(
  'chk_saved_products_one_target',
  `("product_id" IS NOT NULL) <> ("listing_id" IS NOT NULL)`,
)
@Unique(['buyerId', 'productId'])
@Unique(['buyerId', 'listingId'])
@Index(['listingId'])
@Index(['buyerId'])
@Index(['productId'])
@Index(['buyerId', 'deletedAt'])
@Index(['createdAt'])
export class SavedProduct {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'buyer_id' })
  buyer!: User;

  @Column({ name: 'buyer_id', type: 'uuid' })
  buyerId!: string;

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

  @Column({ type: 'text', nullable: true })
  note!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @Column({ name: 'deleted_at', type: 'timestamp', nullable: true })
  deletedAt!: Date | null;

  get isActive(): boolean {
    return this.deletedAt === null;
  }
}
