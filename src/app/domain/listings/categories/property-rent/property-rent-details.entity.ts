import {
  Column,
  Entity,
  Index,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Listing } from '../../entities/listing.entity';
import {
  Facility,
  Furnishing,
  ListedBy,
  MinimumRentalPeriod,
  PricePeriod,
  PropertyCondition,
  PropertyType,
} from './property-rent.enums';

// one row per "Houses & Apartments for Rent" listing
@Entity('property_rent_details')
@Index(['propertyType'])
@Index(['bedrooms'])
export class PropertyRentDetails {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @OneToOne(() => Listing, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'listing_id' })
  listing!: Listing;

  @Column({ name: 'listing_id', type: 'uuid' })
  listingId!: string;

  @Column({ type: 'varchar', length: 60 })
  address!: string;

  @Column({ name: 'estate_name', type: 'varchar', length: 60, nullable: true })
  estateName!: string | null;

  @Column({
    name: 'property_size',
    type: 'varchar',
    length: 30,
    nullable: true,
  })
  propertySize!: string | null;

  @Column({ name: 'property_type', type: 'varchar', length: 30 })
  propertyType!: PropertyType;

  @Column({ type: 'varchar', length: 30 })
  condition!: PropertyCondition;

  @Column({ type: 'varchar', length: 30 })
  furnishing!: Furnishing;

  @Column({ type: 'smallint' })
  bedrooms!: number;

  @Column({ type: 'smallint' })
  bathrooms!: number;

  @Column({ type: 'smallint', nullable: true })
  toilets!: number | null;

  @Column({ type: 'text', array: true, default: () => "'{}'" })
  facilities!: Facility[];

  @Column({ name: 'listed_by', type: 'varchar', length: 20, nullable: true })
  listedBy!: ListedBy | null;

  @Column({ name: 'service_charge', type: 'boolean', default: false })
  serviceCharge!: boolean;

  @Column({ name: 'minimum_rental_period', type: 'varchar', length: 30 })
  minimumRentalPeriod!: MinimumRentalPeriod;

  @Column({
    name: 'price_period',
    type: 'varchar',
    length: 20,
    default: PricePeriod.PER_ANNUM,
  })
  pricePeriod!: PricePeriod;
}
