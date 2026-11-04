import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Lodge } from './lodge.entity';

// a camp assembly point corpers are picked up from; position 0 is the primary gate
@Entity('lodge_assembly_gates')
@Index(['lodgeId', 'position'])
export class LodgeAssemblyGate {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Lodge, (lodge) => lodge.gates, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'lodge_id' })
  lodge!: Lodge;

  @Column({ name: 'lodge_id', type: 'uuid' })
  lodgeId!: string;

  @Column({ type: 'varchar', length: 100 })
  name!: string;

  // "Beside Car Wash Shed & Army Checkpoint Turnaround"
  @Column({ type: 'varchar', length: 200, nullable: true })
  description!: string | null;

  @Column({
    name: 'marshal_name',
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  marshalName!: string | null;

  @Column({
    name: 'marshal_phone',
    type: 'varchar',
    length: 20,
    nullable: true,
  })
  marshalPhone!: string | null;

  @Column({ type: 'smallint', default: 0 })
  position!: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
