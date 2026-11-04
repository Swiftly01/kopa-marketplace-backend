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
import { Lodge } from './lodge.entity';

@Entity('lodge_images')
@Index(['lodgeId', 'position'])
@Index('UQ_lodge_images_cover', ['lodgeId'], {
  unique: true,
  where: '"is_cover" = true',
})
export class LodgeImage {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Lodge, (lodge) => lodge.images, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'lodge_id' })
  lodge!: Lodge;

  @Column({ name: 'lodge_id', type: 'uuid' })
  lodgeId!: string;

  @Column({ type: 'text' })
  url!: string;

  @Column({ name: 'thumbnail_url', type: 'text', nullable: true })
  thumbnailUrl!: string | null;

  @Column({ name: 'public_id', type: 'varchar', length: 255, unique: true })
  publicId!: string;

  // e.g. "Male Dormitory (Wing A)"
  @Column({ type: 'varchar', length: 60, nullable: true })
  label!: string | null;

  @Column({ name: 'is_cover', type: 'boolean', default: false })
  isCover!: boolean;

  @Column({ type: 'integer' })
  position!: number;

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
