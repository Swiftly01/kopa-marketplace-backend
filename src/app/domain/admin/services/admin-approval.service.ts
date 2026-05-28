import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { EmailService } from '../../../auth/services/email.service';
import { DocumentType } from '../../../common/enums/document.enum';
import { UserRole } from '../../../common/enums/roles-enum';
import { SellerVerificationStatusEnum } from '../../../common/enums/seller-verification-status.enum';
import { StatusEnum } from '../../../common/enums/status.enum';
import { PaginationProvider } from '../../../common/pagination/providers/pagination.provider';
import { QueryFilterProvider } from '../../../common/providers/query-filter-provider';
import { AppLogger } from '../../../logger/logger.service';
import { SellerOnboardingProgress } from '../../sellers/entities/seller-onboarding-progress.entity';
import { User } from '../../users/entities/user.entity';
import { FilterUsersDto } from '../dtos/filter-users-dto';

@Injectable()
export class AdminApprovalService {
  private readonly context = AdminApprovalService.name;
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(SellerOnboardingProgress)
    private readonly onboardingProgressRepository: Repository<SellerOnboardingProgress>,
    private readonly queryFilterProvider: QueryFilterProvider,
    private readonly paginateProvider: PaginationProvider,
    private readonly emailService: EmailService,
    private readonly logger: AppLogger,
  ) {}

  /**
   * Get seller statistics
   *
   * Returns approval metrics and statistics.
   * Useful for admin dashboard analytics.
   */
  async getStatistics(): Promise<{
    pending: number;
    approved: number;
    rejected: number;
    approvalRate: number;
  }> {
    const pending = await this.onboardingProgressRepository.count({
      where: [
        { status: SellerVerificationStatusEnum.IN_PROGRESS },
        { status: SellerVerificationStatusEnum.PENDING_REVIEW },
      ],
    });

    const approved = await this.onboardingProgressRepository.count({
      where: { status: SellerVerificationStatusEnum.APPROVED },
    });

    const rejected = await this.onboardingProgressRepository.count({
      where: { status: SellerVerificationStatusEnum.REJECTED },
    });

    const total = pending + approved + rejected;

    const approvalRate = total > 0 ? (approved / total) * 100 : 0;

    return {
      pending,
      approved,
      rejected,
      approvalRate: Math.round(approvalRate),
    };
  }

  async getSellersVerification(query: FilterUsersDto, baseUrl?: string) {
    this.logger.log(
      { message: `Get ${query.verificationStatus} sellers`, data: query },
      this.context,
    );
    let qb = this.onboardingProgressRepository
      .createQueryBuilder('onboarding')
      .leftJoinAndSelect('onboarding.user', 'user')
      .where('onboarding.status = :status', {
        status: query.verificationStatus,
      })
      .orderBy('onboarding.updatedAt', 'DESC');

    qb = this.queryFilterProvider.applyFilters(qb, query, {
      alias: 'user',
      secondaryAliases: {
        onboarding: 'onboarding',
      },

      searchableFields: ['email', 'firstName'],

      allowedSortFields: ['user.email', 'user.role', 'onboarding.createdAt'],

      allowedBooleanFields: ['isActive'],

      allowedEnumFields: {
        status: Object.values(SellerVerificationStatusEnum), // onboarding
      },

      dateField: 'createdAt',
    });

    return this.paginateProvider.paginateQuery(qb, query, baseUrl);
  }

  async getSellerReview(userId: string, adminId: string) {
    this.logger.debug(`Admin ${adminId} viewing seller ${userId} for review`);

    const onboarding = await this.onboardingProgressRepository.findOne({
      where: { userId },
      relations: ['user', 'documents'],
    });

    if (!onboarding) {
      throw new NotFoundException('Seller not found');
    }

    // Log the view action
    this.logger.log(`Admin ${adminId} accessed seller ${userId} review`);

    return this.mapToSellerReview(onboarding);
  }

  /**
   * Approve seller for selling
   *
   * Sets seller status to APPROVED.
   * Seller can now create products and start selling.
   * Sends approval email to seller.
   *
   * This is the final step after all verification is complete.
   *
   * @param userId - Seller user ID
   * @param adminId - Admin approving (for audit)
   * @param adminNotes - Optional notes about approval
   * @returns Approval confirmation
   *
   * @throws NotFoundException - Seller not found
   * @throws BadRequestException - Seller not in PENDING_REVIEW state
   *
   * @example
   * const result = await adminVerificationService.approveSeller(
   *   'seller-uuid',
   *   'admin-uuid',
   *   'All documents verified'
   * );
   */
  async approveSeller(
    userId: string,
    adminId: string,
  ): Promise<{
    success: boolean;
    message: string;
    sellerId: string;
  }> {
    this.logger.log(`Admin ${adminId} approving seller ${userId}`);

    const onboarding = await this.onboardingProgressRepository.findOne({
      where: { userId },
    });

    if (!onboarding) {
      throw new NotFoundException('Seller not found');
    }

    // if (
    //   !onboarding.isIdVerificationCompleted ||
    //   !onboarding.isFaceVerificationCompleted ||
    //   !onboarding.isStoreProfileCompleted
    // ) {
    //   throw new BadRequestException('Seller onboarding is incomplete');
    // }

    const updatedOnboarding = await this.dataSource.transaction(
      async (manager) => {
        const onboardingRepo = manager.getRepository(SellerOnboardingProgress);
        const userRepo = manager.getRepository(User);

        const onboardingInTx = await onboardingRepo.findOne({
          where: { userId },
          lock: { mode: 'pessimistic_write' },
        });

        if (!onboardingInTx) {
          throw new NotFoundException('Seller not found');
        }

        // if (
        //   onboardingInTx.status !==
        //     SellerVerificationStatusEnum.PENDING_REVIEW &&
        //   onboardingInTx.status !== SellerVerificationStatusEnum.IN_PROGRESS
        // ) {
        //   throw new BadRequestException(
        //     `Seller cannot be approved from status: ${onboardingInTx.status}`,
        //   );
        // }

        const user = await userRepo.findOne({
          where: { id: onboardingInTx.userId },
        });

        if (!user) {
          throw new NotFoundException('User not found');
        }

        onboardingInTx.isIdVerificationCompleted = true;
        onboardingInTx.isFaceVerificationCompleted = true;
        onboardingInTx.isStoreProfileCompleted = true;
        onboardingInTx.isAdminVerificationCompleted = true;

        onboardingInTx.stepsCompleted =
          this.calculateStepsCompleted(onboardingInTx);

        onboardingInTx.idVerificationStatus = StatusEnum.APPROVED;
        onboardingInTx.faceVerificationStatus = StatusEnum.APPROVED;
        onboardingInTx.storeProfileStatus = StatusEnum.APPROVED;

        onboardingInTx.status = SellerVerificationStatusEnum.APPROVED;
        onboardingInTx.reviewedByAdminId = adminId;
        onboardingInTx.approvedAt = new Date();
        onboardingInTx.reviewedAt = new Date();

        await onboardingRepo.save(onboardingInTx);

        user.isEmailVerified = true;
        user.role = UserRole.SELLER;

        await userRepo.save(user);

        return { onboardingInTx, user };
      },
    );

    this.logger.log(`Seller ${userId} approved by admin ${adminId}`);

    const { onboardingInTx, user } = updatedOnboarding;

    try {
      await this.emailService.sendApprovalEmail(
        user.email,
        user.firstName,
        onboardingInTx.storeProfileData.storeName,
      );
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(
          `Failed to send approval email to ${user.email}`,
          error.stack,
        );
      } else {
        this.logger.error(
          `Failed to send approval email to ${user.email}`,
          'Unknown error',
        );
      }
    }

    return {
      success: true,
      message: 'Seller approved successfully. Approval email sent.',
      sellerId: userId,
    };
  }

  async rejectSeller(
    userId: string,
    adminId: string,
    reason: string,
    stepToReject?: number,
  ): Promise<{
    success: boolean;
    message: string;
    reason: string;
  }> {
    if (!reason || reason.trim().length === 0) {
      throw new BadRequestException('Rejection reason is required');
    }

    this.logger.log(
      `Admin ${adminId} rejecting seller ${userId}. Reason: ${reason}`,
    );

    const onboarding = await this.onboardingProgressRepository.findOne({
      where: { userId },
      relations: ['user'],
    });

    if (!onboarding) {
      throw new NotFoundException('Seller not found');
    }

    // if (onboarding.status !== SellerVerificationStatusEnum.PENDING_REVIEW) {
    //   throw new BadRequestException(
    //     `Seller cannot be rejected. Current status: ${onboarding.status}`,
    //   );
    // }

    onboarding.status = SellerVerificationStatusEnum.REJECTED;
    onboarding.rejectionReason = reason;
    onboarding.reviewedByAdminId = adminId;

    if (stepToReject && stepToReject >= 1 && stepToReject <= 4) {
      const stepMap = {
        1: 'isIdVerificationCompleted',
        2: 'isFaceVerificationCompleted',
        3: 'isStoreProfileCompleted',
        4: 'isAdminVerificationCompleted',
      } as const;

      const field = stepMap[stepToReject as keyof typeof stepMap];

      if (!field) {
        throw new BadRequestException('Invalid step');
      }

      // Reset rejected step
      onboarding[field] = false;

      //  Reset all steps AFTER it (critical for consistency)
      if (stepToReject <= 1) onboarding.isFaceVerificationCompleted = false;
      if (stepToReject <= 2) onboarding.isStoreProfileCompleted = false;
      if (stepToReject <= 3) onboarding.isAdminVerificationCompleted = false;

      // Update step-specific statuses
      if (stepToReject === 1)
        onboarding.idVerificationStatus = StatusEnum.REJECTED;
      if (stepToReject === 2)
        onboarding.faceVerificationStatus = StatusEnum.REJECTED;
      if (stepToReject === 3)
        onboarding.storeProfileStatus = StatusEnum.REJECTED;

      //  progress pointer
      onboarding.currentStep = stepToReject;
    }

    //  sync bitmap
    onboarding.stepsCompleted = this.calculateStepsCompleted(onboarding);

    await this.onboardingProgressRepository.save(onboarding);

    try {
      await this.emailService.sendRejectionEmail(
        onboarding.user.email,
        onboarding.user.firstName,
        reason,
        stepToReject,
      );

      this.logger.log(`Sent rejection email to ${onboarding.user.email}`);
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(
          `Failed to send rejection email to ${onboarding.user.email}`,
          error.message,
        );
      } else {
        this.logger.error(
          `Failed to send rejection email to ${onboarding.user.email}`,
          'Unknown error',
        );
      }
    }

    return {
      success: true,
      message: 'Seller rejected. Rejection email sent.',
      reason,
    };
  }

  async verifyStep(
    sellerId: string,
    step: number,
    verified: boolean,
    adminId: string,
  ) {
    if (step < 1 || step > 4) {
      throw new BadRequestException('Step must be between 1 and 4');
    }

    const onboarding = await this.onboardingProgressRepository.findOne({
      where: { userId: sellerId },
    });

    if (!onboarding) {
      throw new NotFoundException('Seller onboarding record not found');
    }

    const stepMap = {
      1: 'isIdVerificationCompleted',
      2: 'isFaceVerificationCompleted',
      3: 'isStoreProfileCompleted',
      4: 'isAdminVerificationCompleted',
    } as const;

    const field = stepMap[step as keyof typeof stepMap];

    onboarding[field] = verified;
    onboarding.reviewedByAdminId = adminId;
    onboarding.status = SellerVerificationStatusEnum.PENDING_REVIEW;

    // sync bitmap
    onboarding.stepsCompleted = this.calculateStepsCompleted(onboarding);

    await this.onboardingProgressRepository.save(onboarding);

    this.logger.log(
      `Step ${step} ${verified ? 'verified' : 'rejected'} for seller ${sellerId}`,
    );

    return onboarding;
  }

  private calculateStepsCompleted(
    onboarding: SellerOnboardingProgress,
  ): number {
    let steps = 0;

    if (onboarding.isIdVerificationCompleted) steps |= 1 << 0;
    if (onboarding.isFaceVerificationCompleted) steps |= 1 << 1;
    if (onboarding.isStoreProfileCompleted) steps |= 1 << 2;
    if (onboarding.isAdminVerificationCompleted) steps |= 1 << 3;

    return steps;
  }

  private mapToSellerReview(onboarding: SellerOnboardingProgress) {
    const documents = onboarding.documents ?? [];

    const docsMap = Object.fromEntries(
      documents.map((d) => [d.documentType, d]),
    );

    const idFront = docsMap[DocumentType.ID_FRONT];
    const idBack = docsMap[DocumentType.ID_BACK];
    const liveness = docsMap[DocumentType.SELFIE];

    return {
      userId: onboarding.userId,
      storeName: onboarding.storeProfileData?.storeName,
      email: onboarding.user?.email,
      firstName: onboarding.user?.firstName,
      lastName: onboarding.user?.lastName,
      phoneNumber: onboarding.user?.phoneNumber,
      status: onboarding.status,
      currentStep: onboarding.currentStep,
      stepsCompleted: onboarding.stepsCompleted,
      submittedAt: onboarding.updatedAt,
      allStepsData: {
        step1: {
          completed: onboarding.isIdVerificationCompleted,
          idFullName: onboarding.idVerificationData?.fullName,
          idStateCode: onboarding.idVerificationData?.stateCode,
          idFrontImageUrl: idFront?.cloudinaryUrl,
          idBackImageUrl: idBack?.cloudinaryUrl,
        },
        step2: {
          completed: onboarding.isFaceVerificationCompleted,
          livenessImageUrl: liveness?.cloudinaryUrl,
        },
        step3: {
          completed: onboarding.isStoreProfileCompleted,
          storeName: onboarding.storeProfileData?.storeName,
          whatsappNumber: onboarding.storeProfileData?.whatsappNumber,
        },
        step4: {
          completed: onboarding.isAdminVerificationCompleted,
        },
      },
    };
  }
}
