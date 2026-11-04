import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { bigintTransformer } from '../../listings/utils/bigint.transformer';
import {
  InventoryMode,
  LodgeAvailability,
  LodgeStatus,
} from '../enums/lodge.enums';
import { decimalTransformer } from '../utils/decimal.transformer';
import { FamilyHouse } from './family-house.entity';
import { LodgeAssemblyGate } from './lodge-assembly-gate.entity';
import { LodgeBedSlot } from './lodge-bed-slot.entity';
import { LodgeRoom } from './lodge-room.entity';
import { LodgeImage } from './lodge-image.entity';
import { LodgePickupBatch } from './lodge-pickup-batch.entity';

// corridor notes shown on the logistics dashboard
export interface TransitInfo {
  distanceKm?: number;
  etaMinutes?: number;
  trafficStatus?: string;
  checkpointStatus?: string;
  fuelStatus?: string;
  trackingUrl?: string;
}

export interface HouseRule {
  title: string;
  description?: string;
  enabled: boolean;
  // free text such as "06:00 AM - 06:45 AM" or "09:00 PM Prompt"
  value?: string;
  level: string;
}

@Entity('lodges')
@Index(['familyHouseId', 'status'])
@Index(['status', 'availability', 'publishedAt'])
@Index(['stateCode', 'lgaName'])
export class Lodge {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => FamilyHouse, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'family_house_id' })
  familyHouse!: FamilyHouse;

  @Column({ name: 'family_house_id', type: 'uuid' })
  familyHouseId!: string;

  @Column({ type: 'varchar', length: 150 })
  name!: string;

  @Column({ type: 'varchar', length: 180, unique: true })
  slug!: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  fellowship!: string | null;

  @Column({ type: 'text' })
  address!: string;

  @Column({ type: 'varchar', length: 200, nullable: true })
  landmark!: string | null;

  @Column({ name: 'state_code', type: 'varchar', length: 10, nullable: true })
  stateCode!: string | null;

  @Column({ name: 'state_name', type: 'varchar', length: 100, nullable: true })
  stateName!: string | null;

  @Column({ name: 'lga_name', type: 'varchar', length: 100, nullable: true })
  lgaName!: string | null;

  @Column({ name: 'maps_url', type: 'varchar', length: 1024, nullable: true })
  mapsUrl!: string | null;

  @Column({
    type: 'decimal',
    precision: 9,
    scale: 6,
    nullable: true,
    transformer: decimalTransformer,
  })
  latitude!: number | null;

  @Column({
    type: 'decimal',
    precision: 9,
    scale: 6,
    nullable: true,
    transformer: decimalTransformer,
  })
  longitude!: number | null;

  @Column({
    name: 'coordinator_name',
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  coordinatorName!: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  hotline!: string | null;

  @Column({
    name: 'whatsapp_number',
    type: 'varchar',
    length: 20,
    nullable: true,
  })
  whatsappNumber!: string | null;

  @Column({
    name: 'inventory_mode',
    type: 'varchar',
    length: 20,
    default: InventoryMode.DORM_BUNK,
  })
  inventoryMode!: InventoryMode;

  @Column({ name: 'transit_info', type: 'jsonb', nullable: true })
  transitInfo!: TransitInfo | null;

  // false for lodges that do not track individual beds
  @Column({ name: 'bed_slots_enabled', type: 'boolean', default: true })
  bedSlotsEnabled!: boolean;

  // overall cap when beds are not tracked; null means no cap
  @Column({ type: 'smallint', nullable: true })
  capacity!: number | null;

  /** Whole Naira per bed; null means free or not stated. */
  @Column({
    name: 'price_per_bed',
    type: 'bigint',
    nullable: true,
    transformer: bigintTransformer,
  })
  pricePerBed!: number | null;

  @Column({ type: 'text', array: true, default: () => "'{}'" })
  amenities!: string[];

  @Column({ name: 'house_rules', type: 'jsonb', default: () => "'[]'" })
  houseRules!: HouseRule[];

  @Column({ name: 'pickup_enabled', type: 'boolean', default: false })
  pickupEnabled!: boolean;

  @Column({ name: 'pickup_date', type: 'date', nullable: true })
  pickupDate!: string | null;

  @Column({
    name: 'logistics_lead_name',
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  logisticsLeadName!: string | null;

  @Column({
    name: 'logistics_lead_phone',
    type: 'varchar',
    length: 20,
    nullable: true,
  })
  logisticsLeadPhone!: string | null;

  @Column({ type: 'varchar', length: 20, default: LodgeStatus.DRAFT })
  status!: LodgeStatus;

  @Column({ type: 'varchar', length: 20, default: LodgeAvailability.OPEN })
  availability!: LodgeAvailability;

  @Column({ name: 'published_at', type: 'timestamptz', nullable: true })
  publishedAt!: Date | null;

  @OneToMany(() => LodgeImage, (image) => image.lodge)
  images!: LodgeImage[];

  @OneToMany(() => LodgeBedSlot, (slot) => slot.lodge)
  bedSlots!: LodgeBedSlot[];

  @OneToMany(() => LodgeRoom, (room) => room.lodge)
  rooms!: LodgeRoom[];

  @OneToMany(() => LodgeAssemblyGate, (gate) => gate.lodge)
  gates!: LodgeAssemblyGate[];

  @OneToMany(() => LodgePickupBatch, (batch) => batch.lodge)
  pickupBatches!: LodgePickupBatch[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @DeleteDateColumn({ name: 'deleted_at', nullable: true })
  deletedAt!: Date | null;
}
