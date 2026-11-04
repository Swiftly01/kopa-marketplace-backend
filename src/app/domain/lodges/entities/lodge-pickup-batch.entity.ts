import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { BatchStatus } from '../enums/lodge.enums';
import { LodgeAssemblyGate } from './lodge-assembly-gate.entity';
import { Lodge } from './lodge.entity';

@Entity('lodge_pickup_batches')
@Index(['lodgeId', 'position'])
export class LodgePickupBatch {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Lodge, (lodge) => lodge.pickupBatches, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'lodge_id' })
  lodge!: Lodge;

  @Column({ name: 'lodge_id', type: 'uuid' })
  lodgeId!: string;

  // "Batch 01 (Early)"
  @Column({ type: 'varchar', length: 40 })
  label!: string;

  // 24h "HH:mm"
  @Column({ name: 'start_time', type: 'varchar', length: 5 })
  startTime!: string;

  @Column({ name: 'end_time', type: 'varchar', length: 5 })
  endTime!: string;

  @Column({ type: 'smallint' })
  capacity!: number;

  @ManyToOne(() => LodgeAssemblyGate, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'gate_id' })
  gate!: LodgeAssemblyGate | null;

  @Column({ name: 'gate_id', type: 'uuid', nullable: true })
  gateId!: string | null;

  // "Toyota HiAce Coaster (White)"
  @Column({
    name: 'vehicle_name',
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  vehicleName!: string | null;

  @Column({ name: 'driver_name', type: 'varchar', length: 100, nullable: true })
  driverName!: string | null;

  @Column({ name: 'driver_phone', type: 'varchar', length: 20, nullable: true })
  driverPhone!: string | null;

  @Column({ type: 'varchar', length: 20, default: BatchStatus.SCHEDULED })
  status!: BatchStatus;

  @Column({ name: 'departed_at', type: 'timestamptz', nullable: true })
  departedAt!: Date | null;

  @Column({ name: 'arrived_at', type: 'timestamptz', nullable: true })
  arrivedAt!: Date | null;

  // planned drive time, used for the trip progress bar and ETA
  @Column({ name: 'trip_minutes', type: 'smallint', nullable: true })
  tripMinutes!: number | null;

  // luggage and loading notes
  @Column({
    name: 'vehicle_note',
    type: 'varchar',
    length: 200,
    nullable: true,
  })
  vehicleNote!: string | null;

  @Column({ type: 'smallint', default: 0 })
  position!: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
