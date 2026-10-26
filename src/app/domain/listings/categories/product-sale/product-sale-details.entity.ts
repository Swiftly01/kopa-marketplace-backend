import {
  Column,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Listing } from '../../entities/listing.entity';
import { ProductCondition } from './product-sale.enums';

// one row per generic "item for sale" listing
@Entity('product_sale_details')
export class ProductSaleDetails {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @OneToOne(() => Listing, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'listing_id' })
  listing!: Listing;

  @Column({ name: 'listing_id', type: 'uuid' })
  listingId!: string;

  @Column({ type: 'varchar', length: 30 })
  condition!: ProductCondition;

  @Column({ type: 'varchar', length: 60, nullable: true })
  brand!: string | null;

  @Column({ type: 'integer', default: 1 })
  quantity!: number;
}
