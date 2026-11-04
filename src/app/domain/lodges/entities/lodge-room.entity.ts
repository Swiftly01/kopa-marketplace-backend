import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { bigintTransformer } from '../../listings/utils/bigint.transformer';
import { BedWing, RoomKind } from '../enums/lodge.enums';
import { LodgeBedSlot } from './lodge-bed-slot.entity';
import { Lodge } from './lodge.entity';

// a room or partition that groups bed slots (R01, R02 ...)
@Entity('lodge_rooms')
@Unique(['lodgeId', 'code'])
@Index(['lodgeId', 'position'])
export class LodgeRoom {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Lodge, (lodge) => lodge.rooms, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'lodge_id' })
  lodge!: Lodge;

  @Column({ name: 'lodge_id', type: 'uuid' })
  lodgeId!: string;

  @Column({ type: 'varchar', length: 10 })
  code!: string;

  @Column({ type: 'varchar', length: 100 })
  name!: string;

  // "First Floor West - 4 standard single/bunk beds"
  @Column({ type: 'varchar', length: 200, nullable: true })
  description!: string | null;

  @Column({ type: 'varchar', length: 20, default: RoomKind.SHARED })
  kind!: RoomKind;

  // null for private or mixed rooms
  @Column({ type: 'varchar', length: 10, nullable: true })
  wing!: BedWing | null;

  // "Ceiling Fan", "Ensuite Bath"
  @Column({ type: 'text', array: true, default: () => "'{}'" })
  features!: string[];

  /** Whole Naira per month; null when there is no contribution. */
  @Column({
    name: 'rent_contribution',
    type: 'bigint',
    nullable: true,
    transformer: bigintTransformer,
  })
  rentContribution!: number | null;

  @Column({ type: 'smallint', default: 0 })
  position!: number;

  @OneToMany(() => LodgeBedSlot, (slot) => slot.room)
  bedSlots!: LodgeBedSlot[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
