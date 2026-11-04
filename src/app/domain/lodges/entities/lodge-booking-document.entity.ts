import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { bigintTransformer } from '../../listings/utils/bigint.transformer';
import { LodgeBooking } from './lodge-booking.entity';

@Entity('lodge_booking_documents')
@Index(['bookingId'])
export class LodgeBookingDocument {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => LodgeBooking, (booking) => booking.documents, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'booking_id' })
  booking!: LodgeBooking;

  @Column({ name: 'booking_id', type: 'uuid' })
  bookingId!: string;

  @Column({ type: 'text' })
  url!: string;

  @Column({ name: 'public_id', type: 'varchar', length: 255, unique: true })
  publicId!: string;

  @Column({ name: 'file_name', type: 'varchar', length: 255 })
  fileName!: string;

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
