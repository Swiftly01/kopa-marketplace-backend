import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Product } from './product.entity';

@Entity('product_images')
@Index(['productId'])
@Index(['order'])
@Index(['cloudinaryPublicId'])
export class ProductImage {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /**
   * Reference to Product entity
   * Many images per product
   * ON DELETE CASCADE: If product deleted, images deleted too
   */
  @ManyToOne(() => Product, (product) => product.images, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'product_id' })
  product!: Product;

  @Column({ name: 'product_id', type: 'uuid' })
  productId!: string;

  @Column({ type: 'text', name: 'cloudinary_url' })
  cloudinaryUrl!: string;

  @Column({
    name: ' cloudinary_public_id',
    type: 'varchar',
    length: 255,
    unique: true,
  })
  cloudinaryPublicId!: string;

  /**
   * Image order in gallery
   * 1 = main image (thumbnail)
   * 2-6 = additional images
   */
  @Column({ type: 'integer' })
  order!: number;

  @Column({ type: 'varchar', length: 255, nullable: true })
  filename!: string;

  @Column({ name: 'file_size', type: 'bigint', nullable: true })
  fileSize!: number;

  @Column({ type: 'varchar', length: 50, nullable: true })
  format!: string;

  @Column({ name: 'is_main', type: 'boolean', default: false })
  isMain!: boolean;

  /**
   * Upload timestamp
   */
  @CreateDateColumn()
  uploadedAt!: Date;
}
