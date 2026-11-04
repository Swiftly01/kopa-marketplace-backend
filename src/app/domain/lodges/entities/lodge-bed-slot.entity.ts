import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { BedSlotStatus, BedWing, BunkType } from '../enums/lodge.enums';
import { LodgeRoom } from './lodge-room.entity';
import { Lodge } from './lodge.entity';

@Entity('lodge_bed_slots')
@Unique(['lodgeId', 'code'])
@Index(['lodgeId', 'wing', 'status'])
@Index(['roomId'])
export class LodgeBedSlot {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Lodge, (lodge) => lodge.bedSlots, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'lodge_id' })
  lodge!: Lodge;

  @Column({ name: 'lodge_id', type: 'uuid' })
  lodgeId!: string;

  @ManyToOne(() => LodgeRoom, (room) => room.bedSlots, {
    onDelete: 'SET NULL',
    nullable: true,
  })
  @JoinColumn({ name: 'room_id' })
  room!: LodgeRoom | null;

  @Column({ name: 'room_id', type: 'uuid', nullable: true })
  roomId!: string | null;

  // M-01, F-04 ...
  @Column({ type: 'varchar', length: 10 })
  code!: string;

  @Column({ type: 'varchar', length: 10 })
  wing!: BedWing;

  @Column({ name: 'bunk_type', type: 'varchar', length: 10 })
  bunkType!: BunkType;

  // e.g. "Near Window" or "Reading Lamp Area"
  @Column({ name: 'location_note', type: 'varchar', length: 100, nullable: true })
  locationNote!: string | null;

  @Column({ type: 'varchar', length: 20, default: BedSlotStatus.AVAILABLE })
  status!: BedSlotStatus;

  // shown on the grid when the exco marks a bed occupied by hand (no booking)
  @Column({ name: 'occupant_label', type: 'varchar', length: 60, nullable: true })
  occupantLabel!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
