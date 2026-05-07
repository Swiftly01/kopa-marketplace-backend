import { SellerOnboardingProgress } from '../../sellers/entities/seller-onboarding-progress.entity';

export class PendingSellerResponseDto {
  userId!: string;
  email!: string;
  firstName!: string;
  submittedt!: Date;
  status!: string;

  static fromEntity(onboarding: SellerOnboardingProgress) {
    return {
      userId: onboarding.userId,
      email: onboarding.user.email,
      firstName: onboarding.user.firstName,
      submittedAt: onboarding.updatedAt,
      status: onboarding.status,
    };
  }
}
