import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import {
  BookingSource,
  BookingStatus,
  CorperGender,
  TransitStatus,
} from '../enums/lodge.enums';
import { FamilyHouse } from './family-house.entity';
import { LodgeAssemblyGate } from './lodge-assembly-gate.entity';
import { LodgeBedSlot } from './lodge-bed-slot.entity';
import { LodgeBookingDocument } from './lodge-booking-document.entity';
import { LodgePickupBatch } from './lodge-pickup-batch.entity';
import { Lodge } from './lodge.entity';

const ACTIVE_WHERE = `"status" IN ('pending','confirmed','checked_in')`;

@Entity('lodge_bookings')
@Index(['familyHouseId', 'status'])
@Index(['lodgeId', 'status'])
@Index(['corperId', 'status'])
@Index(['pickupBatchId'])
@Index(['pickupGateId'])
// a corper holds one bed at a time and a bed has one active booking
@Index('UQ_lodge_bookings_active_corper', ['corperId'], {
  unique: true,
  where: ACTIVE_WHERE,
})
@Index('UQ_lodge_bookings_active_bed', ['bedSlotId'], {
  unique: true,
  where: ACTIVE_WHERE,
})
export class LodgeBooking {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Lodge, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'lodge_id' })
  lodge!: Lodge;

  @Column({ name: 'lodge_id', type: 'uuid' })
  lodgeId!: string;

  // copied from the lodge so house-scoped queries need no join
  @ManyToOne(() => FamilyHouse, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'family_house_id' })
  familyHouse!: FamilyHouse;

  @Column({ name: 'family_house_id', type: 'uuid' })
  familyHouseId!: string;

  // null for walk-ins the exco enters by hand
  @ManyToOne(() => User, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'corper_id' })
  corper!: User | null;

  @Column({ name: 'corper_id', type: 'uuid', nullable: true })
  corperId!: string | null;

  @Column({ type: 'varchar', length: 10, default: BookingSource.SELF })
  source!: BookingSource;

  @ManyToOne(() => LodgeBedSlot, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'bed_slot_id' })
  bedSlot!: LodgeBedSlot | null;

  @Column({ name: 'bed_slot_id', type: 'uuid', nullable: true })
  bedSlotId!: string | null;

  @ManyToOne(() => LodgePickupBatch, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'pickup_batch_id' })
  pickupBatch!: LodgePickupBatch | null;

  @Column({ name: 'pickup_batch_id', type: 'uuid', nullable: true })
  pickupBatchId!: string | null;

  @Column({ type: 'varchar', length: 30, unique: true })
  passcode!: string;

  @Column({ type: 'varchar', length: 20, default: BookingStatus.PENDING })
  status!: BookingStatus;

  @Column({ name: 'full_name', type: 'varchar', length: 120 })
  fullName!: string;

  // NYSC call-up / state code, e.g. OS/26A/0123
  @Column({ name: 'call_up_number', type: 'varchar', length: 40 })
  callUpNumber!: string;

  @Column({ name: 'whatsapp_phone', type: 'varchar', length: 20 })
  whatsappPhone!: string;

  @Column({ type: 'varchar', length: 10 })
  gender!: CorperGender;

  @Column({
    name: 'lights_out_routine',
    type: 'varchar',
    length: 60,
    nullable: true,
  })
  lightsOutRoutine!: string | null;

  @Column({
    name: 'morning_routine',
    type: 'varchar',
    length: 60,
    nullable: true,
  })
  morningRoutine!: string | null;

  @ManyToOne(() => LodgeAssemblyGate, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'pickup_gate_id' })
  pickupGate!: LodgeAssemblyGate | null;

  @Column({ name: 'pickup_gate_id', type: 'uuid', nullable: true })
  pickupGateId!: string | null;

  @Column({
    name: 'transit_status',
    type: 'varchar',
    length: 20,
    default: TransitStatus.AWAITING,
  })
  transitStatus!: TransitStatus;

  @Column({ name: 'gate_arrived_at', type: 'timestamptz', nullable: true })
  gateArrivedAt!: Date | null;

  @Column({ name: 'boarded_at', type: 'timestamptz', nullable: true })
  boardedAt!: Date | null;

  @Column({ name: 'arrived_at', type: 'timestamptz', nullable: true })
  arrivedAt!: Date | null;

  @Column({
    name: 'documents_verified_at',
    type: 'timestamptz',
    nullable: true,
  })
  documentsVerifiedAt!: Date | null;

  @Column({ name: 'documents_verified_by', type: 'uuid', nullable: true })
  documentsVerifiedBy!: string | null;

  // "2 Boxes + 1 Bucket"
  @Column({
    name: 'luggage_note',
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  luggageNote!: string | null;

  // "Recharge station / laptop power socket"
  @Column({
    name: 'welfare_need',
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  welfareNeed!: string | null;

  @Column({
    name: 'next_of_kin_name',
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  nextOfKinName!: string | null;

  @Column({
    name: 'next_of_kin_relation',
    type: 'varchar',
    length: 40,
    nullable: true,
  })
  nextOfKinRelation!: string | null;

  @Column({
    name: 'next_of_kin_phone',
    type: 'varchar',
    length: 20,
    nullable: true,
  })
  nextOfKinPhone!: string | null;

  @Column({ name: 'agreed_to_rules_at', type: 'timestamptz' })
  agreedToRulesAt!: Date;

  @Column({
    name: 'rejection_reason',
    type: 'varchar',
    length: 300,
    nullable: true,
  })
  rejectionReason!: string | null;

  @Column({ name: 'reviewed_by', type: 'uuid', nullable: true })
  reviewedBy!: string | null;

  @Column({ name: 'reviewed_at', type: 'timestamptz', nullable: true })
  reviewedAt!: Date | null;

  @Column({ name: 'checked_in_at', type: 'timestamptz', nullable: true })
  checkedInAt!: Date | null;

  @OneToMany(() => LodgeBookingDocument, (doc) => doc.booking)
  documents!: LodgeBookingDocument[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
