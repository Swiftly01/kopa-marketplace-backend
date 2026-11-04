import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { FamilyHouseApplicationStatus } from '../enums/lodge.enums';
import { FamilyHouse } from './family-house.entity';

// a user's request to register a family house; approval creates the house and makes them its admin
@Entity('family_house_applications')
@Index(['status', 'createdAt'])
@Index(['applicantUserId'])
// one open application per person
@Index('UQ_family_house_applications_pending', ['applicantUserId'], {
  unique: true,
  where: `"status" = 'pending'`,
})
export class FamilyHouseApplication {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'applicant_user_id' })
  applicant!: User;

  @Column({ name: 'applicant_user_id', type: 'uuid' })
  applicantUserId!: string;

  @Column({ name: 'house_name', type: 'varchar', length: 150 })
  houseName!: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  fellowship!: string | null;

  @Column({ type: 'text' })
  address!: string;

  @Column({ name: 'state_code', type: 'varchar', length: 10 })
  stateCode!: string;

  @Column({ name: 'state_name', type: 'varchar', length: 100 })
  stateName!: string;

  @Column({ name: 'lga_name', type: 'varchar', length: 100 })
  lgaName!: string;

  @Column({ name: 'contact_phone', type: 'varchar', length: 20 })
  contactPhone!: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  description!: string | null;

  @Column({
    type: 'varchar',
    length: 20,
    default: FamilyHouseApplicationStatus.PENDING,
  })
  status!: FamilyHouseApplicationStatus;

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

  // set when the application is approved
  @ManyToOne(() => FamilyHouse, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'family_house_id' })
  familyHouse!: FamilyHouse | null;

  @Column({ name: 'family_house_id', type: 'uuid', nullable: true })
  familyHouseId!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
