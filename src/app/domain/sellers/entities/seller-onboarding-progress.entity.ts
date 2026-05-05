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
import { SellerVerificationStatusEnum } from '../../../common/enums/seller-verification-status.enum';
import { StatusEnum } from '../../../common/enums/status.enum';
import { SellerOnboardingDocument } from './seller-onboarding-document.entity';
import type { StoreProfileData } from '../../../common/interfaces/store-profile-data.interface';
import type { IdVerificationData } from '../../../common/interfaces/id-verification-data.interface';

@Index(['userId'], { unique: true })
@Index(['status'])
@Index(['currentStep'])
@Index(['createdAt'])
@Entity('seller_onboarding_progress')
export class SellerOnboardingProgress {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /**
   * Reference to User entity (seller)
   * CASCADE DELETE: If user deleted, onboarding record deleted too
   */
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  /**
   * User ID (seller) undergoing onboarding
   * UNIQUE constraint: One user can only have one onboarding record
   */
  @Column({ name: 'user_id', type: 'uuid', unique: true })
  userId!: string;

  /**
   * Current step in onboarding process
   * 1: ID Verification
   * 2: Face Verification (Liveness Check)
   * 3: Store Profile Setup
   * 4: Verification Review (Admin)
   */
  @Column({ name: 'current_step', type: 'integer', default: 1 })
  currentStep!: number;

  /**
   * Steps completed (bitmap: 0b1111 = all steps done)
   * Bit 0: Step 1 completed
   * Bit 1: Step 2 completed
   * Bit 2: Step 3 completed
   * Bit 3: Step 4 completed
   *
   * Example:
   * 0b0001 (1) = Step 1 complete
   * 0b0011 (3) = Steps 1 & 2 complete
   * 0b0111 (7) = Steps 1, 2 & 3 complete
   * 0b1111 (15) = All steps complete
   */
  @Column({ name: 'steps_completed', type: 'integer', default: 0 })
  stepsCompleted!: number;

  /**
   * Overall onboarding status
   * NOT_STARTED: User just registered, not started onboarding
   * IN_PROGRESS: User completed some steps but not all
   * PENDING_REVIEW: All steps completed, awaiting admin review
   * APPROVED: Admin approved, seller can access marketplace
   * REJECTED: Admin rejected, needs to resubmit
   */
  @Column({
    type: 'enum',
    enum: SellerVerificationStatusEnum,
    default: SellerVerificationStatusEnum.NOT_STARTED,
  })
  status!: SellerVerificationStatusEnum;

  /**
   * Step 1: ID Verification
   * Whether ID documents (front and back) were uploaded
   */
  @Column({
    name: 'is_id_verification_completed',
    type: 'boolean',
    default: false,
  })
  isIdVerificationCompleted!: boolean;

  /**
   * Step 2: Face Verification
   * Whether face liveness check (selfie) was completed
   */
  @Column({
    name: 'is_face_verification_completed',
    type: 'boolean',
    default: false,
  })
  isFaceVerificationCompleted!: boolean;

  /**
   * Step 3: Store Profile
   * Whether store profile information was filled
   */
  @Column({
    name: 'is_store_profile_completed',
    type: 'boolean',
    default: false,
  })
  isStoreProfileCompleted!: boolean;

  /**
   * Step 4: Admin Verification
   * Whether admin completed verification review
   */
  @Column({
    name: 'is_admin_verification_completed',
    type: 'boolean',
    default: false,
  })
  isAdminVerificationCompleted!: boolean;

  /**
   * ID verification acceptance status
   * PENDING: Awaiting review
   * APPROVED: ID verified
   * REJECTED: ID rejected, needs resubmission
   */
  @Column({
    name: 'id_verification_status',
    type: 'enum',
    enum: StatusEnum,
    default: StatusEnum.PENDING,
    nullable: true,
  })
  idVerificationStatus!: StatusEnum | null;

  @Column({
    name: 'face_verification_status',
    type: 'enum',
    enum: StatusEnum,
    default: StatusEnum.PENDING,
    nullable: true,
  })
  faceVerificationStatus!: StatusEnum | null;

  /**
   * Face verification details (JSON)
   * Stores:
   * - faceMatchScore: Similarity percentage (0-100)
   * - livenessScore: Liveness detection score (0-100)
   * - isLivenessPassed: Boolean
   * - isIdPhotoMatched: Boolean
   */
  @Column({ name: 'face_verification_data', type: 'jsonb', nullable: true })
  faceVerificationData!: Record<string, any>;

  @Column({
    name: 'store_profile_status',
    type: 'enum',
    enum: StatusEnum,
    default: StatusEnum.PENDING,
    nullable: true,
  })
  storeProfileStatus!: StatusEnum | null;

  @Column({ name: 'rejection_reason', type: 'text', nullable: true })
  rejectionReason!: string;

  @Column({ name: 'reviewed_by_admin_id', type: 'uuid', nullable: true })
  reviewedByAdminId!: string;

  /**
   * Documents uploaded during onboarding
   * ONE-TO-MANY relationship
   * One seller can upload multiple documents
   */
  @OneToMany(
    () => SellerOnboardingDocument,
    (document) => document.onboardingProgress,
  )
  documents!: SellerOnboardingDocument[];

  @Column({ name: 'reviewed_at', type: 'timestamp', nullable: true })
  reviewedAt!: Date;

  /**
   * Store profile data (JSON)
   * Stores:
   * - storeName: String
   * - storeLogoUrl: Cloudinary URL
   * - state: String (Osun, Lagos, etc.)
   * - lga: String (Local Government Area)
   * - whatsappNumber: String
   * - deliveryPreferences: Array ['Camp Meetup', 'Local Delivery']
   */
  @Column({ name: 'store_profile_data', type: 'jsonb', nullable: true })
  storeProfileData!: StoreProfileData;

  /**
   * ID verification details (JSON)
   * Stores:
   * - fullName: From ID
   * - stateCode: From ID
   * - ppaLga: Postal address LGA
   * - idType: 'DRIVER_LICENSE' | 'NATIONAL_ID' | 'PASSPORT'
   * - idNumber: ID number
   */
  @Column({ name: 'id_verification_data', type: 'jsonb', nullable: true })
  idVerificationData!: IdVerificationData;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @Column({ name: 'completed_at', type: 'timestamp', nullable: true })
  completedAt!: Date;

  @Column({ name: 'approved_at', type: 'timestamp', nullable: true })
  approvedAt!: Date;
}
