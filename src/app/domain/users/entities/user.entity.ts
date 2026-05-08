import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Otp } from './otp.entity';
import { UserRole } from '../../../common/enums/roles-enum';
import { OAuthAccount } from './oauth-account.entity';
import { SellerOnboardingProgress } from '../../sellers/entities/seller-onboarding-progress.entity';

@Entity('users')
@Index(['email'], { unique: true })
@Index(['phoneNumber'])
@Index(['emailVerificationToken'])
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  email!: string;

  @Column({ name: 'first_name', type: 'varchar', length: 100 })
  firstName!: string;

  @Column({ name: 'last_name', type: 'varchar', length: 100 })
  lastName!: string;

  @Column({ name: 'phone_number', type: 'varchar', length: 20, nullable: true })
  phoneNumber!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  password!: string | null;

  @Column({
    type: 'varchar',
    default: UserRole.BUYER,
  })
  role!: UserRole;

  @OneToOne(
    () => SellerOnboardingProgress,
    (sellerOnboarding) => sellerOnboarding.user,
  )
  sellerOnboarding!: SellerOnboardingProgress;

  @Column({ name: 'is_email_verified', type: 'boolean', default: false })
  isEmailVerified!: boolean;

  @Column({
    name: 'email_verification_token',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  emailVerificationToken!: string | null;

  /**
   * Email verification token expiration time
   */
  @Column({
    name: 'email_verification_token_expires_at',
    type: 'timestamp',
    nullable: true,
  })
  emailVerificationTokenExpiresAt!: Date | null;

  /**
   * Password reset token - sent in email
   * Allows user to reset forgotten password
   */
  @Column({
    name: 'password_reset_token',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  passwordResetToken!: string | null;

  /**
   * Password reset token expiration time
   */
  @Column({
    name: 'password_reset_token_expires_at',
    type: 'timestamp',
    nullable: true,
  })
  passwordResetTokenExpiresAt!: Date | null;

  /**
   * OTP (One-Time Password) Secret
   * Used for TOTP-based authentication
   */
  @Column({ name: 'otp_secret', type: 'varchar', length: 255, nullable: true })
  otpSecret!: string;

  @OneToMany(() => Otp, (otp) => otp.user, { cascade: true })
  otps!: Otp[];

  /**
   * Whether OTP is enabled for this user
   */
  @Column({ name: 'is_otp_enabled', type: 'boolean', default: false })
  isOtpEnabled!: boolean;

  /**
   * Number of failed login attempts
   * Used for account lockout security
   */
  @Column({ name: 'failed_login_attempts', type: 'integer', default: 0 })
  failedLoginAttempts!: number;

  /**
   * Account locked until timestamp
   * Prevents brute force attacks
   */
  @Column({ name: 'locked_until', type: 'timestamp', nullable: true })
  lockedUntil!: Date | null;

  /**
   * Account status - soft delete support
   */
  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @Column({ name: 'last_login_at', type: 'timestamp', nullable: true })
  lastLoginAt!: Date;

  @OneToMany(() => OAuthAccount, (oauth) => oauth.user)
  oauthAccounts!: OAuthAccount[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
