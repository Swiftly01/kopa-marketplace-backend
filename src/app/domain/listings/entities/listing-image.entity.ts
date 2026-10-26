import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { bigintTransformer } from '../utils/bigint.transformer';
import { Listing } from './listing.entity';

@Entity('listing_images')
@Index(['listingId', 'position'])
export class ListingImage {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Listing, (listing) => listing.images, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'listing_id' })
  listing!: Listing;

  @Column({ name: 'listing_id', type: 'uuid' })
  listingId!: string;

  @Column({ name: 'url', type: 'text' })
  url!: string;

  @Column({ name: 'thumbnail_url', type: 'text', nullable: true })
  thumbnailUrl!: string | null;

  @Column({ name: 'public_id', type: 'varchar', length: 255, unique: true })
  publicId!: string;

  /**
   * 0-based display order. Position 0 is the title picture
   * ("First picture - is the title picture. Drag to reorder.").
   */
  @Column({ type: 'integer' })
  position!: number;

  @Column({ type: 'varchar', length: 50, nullable: true })
  format!: string | null;

  @Column({
    name: 'size_bytes',
    type: 'bigint',
    nullable: true,
    transformer: bigintTransformer,
  })
  sizeBytes!: number | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
