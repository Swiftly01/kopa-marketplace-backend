import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ManyToOne } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { ProductCondition } from '../enums/product-condition.enum';
import { ProductStatus } from '../enums/product-status.enum';
import { ProductImage } from './product-image.entity';
import { Category } from '../../category/entities/category.entity';
import { Location } from '../../location/entities/location.entity';

@Entity('products')
@Index(['categoryId'])
@Index(['sellerId'])
@Index(['location'])
@Index(['status'])
@Index(['createdAt'])
@Index(['isActive'])
@Index(['sellerId', 'status']) //
export class Product {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /**
   * Reference to seller (User entity)
   * Foreign key relationship
   * ON DELETE CASCADE: If seller deleted, products deleted too
   */
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'seller_id' })
  seller!: User;

  /**
   * Seller ID for easier querying
   * Used to filter products by seller
   */
  @Column({ name: 'seller_id', type: 'uuid' })
  sellerId!: string;

  @Column({ type: 'varchar', length: 200 })
  name!: string;

  @Column({ type: 'text', nullable: true })
  description!: string;

  @ManyToOne(() => Category, (category) => category.products)
  @JoinColumn({ name: 'category_id' })
  category!: Category;

  @Column({ name: 'category_id', type: 'uuid' })
  categoryId!: string;

  @Column({ name: 'location_id', type: 'uuid' })
  locationId!: string;

  @ManyToOne(() => Location, (location) => location.products, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'location_id' })
  location!: Location;
  /**
   * Price in Naira (₦)
   * Stored as integer (in kobo/cents for precision)
   * Example: 50000 = ₦50,000
   * Display as: price / 100 for naira
   */
  @Column({ type: 'bigint' })
  price!: number;

  /**
   * Discount percentage (0-100)
   * Optional field
   * Display price: price * (1 - discount / 100)
   */
  @Column({ name: 'discount_percentage', type: 'integer', default: 0 })
  discountPercentage!: number;

  /**
   * Stock quantity available
   * Decremented when order placed
   * Zero means out of stock
   */
  @Column({ type: 'integer', default: 0 })
  stock!: number;

  /**
   * Product SKU (Stock Keeping Unit)
   * Optional unique identifier
   * Useful for inventory management
   */
  @Column({ type: 'varchar', length: 100, nullable: true, unique: true })
  sku!: string;

  /**
   * Product status
   * DRAFT: Still editing, not visible
   * ACTIVE: Published, visible to buyers
   * INACTIVE: Temporarily hidden
   * REMOVED: Deleted by seller
   */
  @Column({
    type: 'enum',
    enum: ProductStatus,
    default: ProductStatus.DRAFT,
  })
  status!: ProductStatus;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  /**
   * Condition of the product
   * NEW: Never used
   * LIKE_NEW: Used but in excellent condition
   * GOOD: Used, minor wear
   * FAIR: Used, visible wear
   */
  @Column({
    type: 'enum',
    enum: ProductCondition,
    default: ProductCondition.NEW,
  })
  condition!: ProductCondition;

  /**
   * Number of views (for analytics)
   * Incremented when product viewed
   */
  @Column({ type: 'integer', default: 0 })
  views!: number;

  @Column({ type: 'decimal', precision: 3, scale: 2, default: 0 })
  rating!: number;

  /**
   * Number of reviews/ratings
   * Used to calculate average rating
   */
  @Column({ type: 'integer', default: 0 })
  reviewCount!: number;

  @OneToMany(() => ProductImage, (image) => image.product, {
    cascade: true,
    onDelete: 'CASCADE',
  })
  images!: ProductImage[];

  /**
   * Additional attributes as JSON
   * Flexible field for custom properties
   * Example: { color: 'red', size: 'large', material: 'cotton' }
   */
  @Column({ type: 'jsonb', nullable: true })
  attributes!: Record<string, any>;

  @Column({ type: 'varchar', length: 255, nullable: true, unique: true })
  slug!: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  /**
   * Soft delete timestamp
   * When product was deleted
   * Null if not deleted
   */
  @Column({ type: 'timestamp', nullable: true })
  deletedAt!: Date;

  getDisplayPrice(): number {
    if (this.discountPercentage > 0) {
      return this.price * (1 - this.discountPercentage / 100);
    }

    return this.price;
  }

  formatPrice(): string {
    return (this.price / 100).toLocaleString('en-NG', {
      style: 'currency',
      currency: 'NGN',
    });
  }

  isInStock(): boolean {
    return (
      this.stock > 0 && this.status === ProductStatus.ACTIVE && this.isActive
    );
  }

  getMainImage(): ProductImage | null {
    return this.images && this.images.length > 0 ? this.images[0] : null;
  }
}
