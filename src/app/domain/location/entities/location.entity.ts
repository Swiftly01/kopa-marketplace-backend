import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Product } from '../../products/entities/product.entity';

export enum LocationType {
  COUNTRY = 'COUNTRY',
  STATE = 'STATE',
  LGA = 'LGA',
}

@Entity('locations')
export class Location {
  @PrimaryGeneratedColumn()
  id!: string;

  @Index()
  @Column()
  code!: string;

  @Index()
  @Column()
  name!: string;

  @Column({ nullable: true })
  slug!: string; // lagos, osun, ife-central

  @Column({ name: 'display_name', nullable: true })
  displayName!: string;

  // ---------- HIERARCHY ----------
  @Index()
  @Column({ name: 'parent_id', type: 'uuid', nullable: true })
  parentId!: string;

  @ManyToOne(() => Location, (location) => location.children, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'parentId' })
  parent!: Location;

  @OneToMany(() => Location, (location) => location.parent)
  children!: Location[];

  @OneToMany(() => Product, (product) => product.location)
  products!: Product[];

  // ---------- TYPE ----------
  @Index()
  @Column({ type: 'enum', enum: LocationType })
  type!: LocationType;

  // ---------- META ----------
  @Column({ default: true })
  isActive!: boolean;

  @Column({ type: 'int', default: 0 })
  sortOrder!: number;

  // ---------- OPTIONAL GEO DATA ----------
  @Column({ type: 'decimal', nullable: true })
  latitude!: number;

  @Column({ type: 'decimal', nullable: true })
  longitude!: number;

  @Column({ nullable: true })
  region!: string; // Southwest, Southeast, etc.

  // ---------- FLEXIBLE EXTENSION ----------
  @Column({ type: 'jsonb', nullable: true })
  metadata!: Record<string, any>;
}
