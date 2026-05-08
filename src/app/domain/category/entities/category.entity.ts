import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  OneToMany,
} from 'typeorm';
import { Product } from '../../products/entities/product.entity';

@Entity('categories')
@Index(['code'], { unique: true })
@Index(['slug'], { unique: true })
@Index(['parentId'])
@Index(['isActive'])
export class Category {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /**
   * Unique category identifier (API + internal use)
   */
  @Column({ type: 'varchar', length: 100, unique: true })
  code!: string;

  /**
   * Display name
   */
  @Column({ type: 'varchar', length: 100 })
  name!: string;

  /**
   * SEO-friendly URL slug
   */
  @Column({ type: 'varchar', length: 150, unique: true })
  slug!: string;

  /**
   * Optional description
   */
  @Column({ type: 'varchar', length: 300, nullable: true })
  description!: string | null;

  /**
   * Icon or emoji for UI
   */
  @Column({ type: 'varchar', length: 50, nullable: true })
  icon!: string | null;

  @OneToMany(() => Product, (product) => product.category)
  products!: Product[];

  /**
   * Parent category (null = main category)
   */
  @Column({ name: 'parent_id', type: 'uuid', nullable: true })
  parentId!: string | null;

  /**
   * Active status (soft disable instead of delete)
   */
  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  /**
   * Featured category (home page display)
   */
  @Column({ name: 'is_featured', type: 'boolean', default: false })
  isFeatured!: boolean;

  /**
   * Sort order for UI display
   */
  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder!: number;

  /**
   * Optional metadata (future flexibility)
   */
  @Column({ type: 'jsonb', nullable: true })
  metadata!: Record<string, any> | null;

  /**
   * Timestamps
   */
  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
