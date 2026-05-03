import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { CloudinaryService } from '../../cloudinary/cloudinary.service';
import { DocumentType } from '../../common/enums/document.enum';
import { SellerVerificationStatusEnum } from '../../common/enums/seller-verification-status.enum';
import { User } from '../users/entities/user.entity';
import { SubmitIdVerificationDto } from './dtos/submit-verification.dto';
import { SellerOnboardingDocument } from './entities/seller-onboarding-document.entity';
import { SellerOnboardingProgress } from './entities/seller-onboarding-progress.entity';
import { SubmitStoreProfileDto } from './dtos/submit-store-profile.dto';

/**
 * Seller Onboarding Service
 *
 * Manages seller onboarding workflow with 4 steps:
 * 1. ID Verification (Upload ID documents)
 * 2. Face Verification (Liveness check with selfie)
 * 3. Store Profile Setup (Store info and logo)
 * 4. Admin Verification (Admin review and approval)
 *
 * Features:
 * - Step-by-step progress tracking
 * - Resume incomplete onboarding
 * - Document management with Cloudinary
 * - Admin review workflow
 * - Status notifications
 *
 * State Machine:
 * NOT_STARTED → IN_PROGRESS → PENDING_REVIEW → APPROVED/REJECTED
 *
 * Each step can be:
 * - PENDING: Not started
 * - APPROVED: Verified and accepted
 * - REJECTED: Needs resubmission
 *
 * Database Transactions:
 * All operations are transactional to ensure data consistency
 */

@Injectable()
export class SellerOnboardingService {
  private readonly logger = new Logger(SellerOnboardingService.name);

  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,

    @InjectRepository(SellerOnboardingProgress)
    private readonly onboardingProgressRepository: Repository<SellerOnboardingProgress>,

    @InjectRepository(SellerOnboardingDocument)
    private readonly documentRepository: Repository<SellerOnboardingDocument>,

    private readonly cloudinaryService: CloudinaryService,
  ) {}

  /**
   * Initialize seller onboarding
   *
   * Creates onboarding record for newly registered user.
   * Called during user registration (via User module).
   *
   * @param userId - User ID of new seller
   * @returns Created onboarding progress record
   *
   * @throws ConflictException - If onboarding already exists
   */
  async initializeOnboarding(
    userId: string,
  ): Promise<SellerOnboardingProgress> {
    this.logger.debug(`Initializing onboarding for user: ${userId}`);

    const existingOnboarding = await this.onboardingProgressRepository.findOne({
      where: { userId },
    });

    if (existingOnboarding) {
      throw new ConflictException(
        'Onboarding already initialize for this user',
      );
    }

    const onboarding = this.onboardingProgressRepository.create({
      userId,
      currentStep: 1,
      status: SellerVerificationStatusEnum.NOT_STARTED,
      stepsCompleted: 0,
    });

    await this.onboardingProgressRepository.save(onboarding);

    this.logger.log(`Onboarding initialized for user: ${userId}`);

    return onboarding;
  }

  /**
   * Get seller's current onboarding progress
   *
   * Retrieves all progress data including completed steps,
   * documents uploaded, and admin feedback.
   *
   * @param userId - User ID of seller
   * @returns Onboarding progress with all details
   *
   * @throws NotFoundException - If onboarding not found
   *
   * @example
   * const progress = await sellerOnboardingService.getProgress(userId);
   * console.log(progress.currentStep); // Current step (1-4)
   * console.log(progress.status); // Overall status
   * console.log(progress.documents); // Uploaded documents
   */

  async getProgress(userId: string) {
    const onboarding = await this.onboardingProgressRepository.findOne({
      where: { userId },
      relations: ['documents'],
    });

    if (!onboarding) {
      throw new NotFoundException('Onboarding record not found');
    }

    return onboarding;
  }

  /**
   * Submit Step 1: ID Verification
   *
   * Upload front and back of ID document.
   * Both files are required.
   * User can retake photos if rejected by admin.
   *
   * Flow:
   * 1. Validate file size and format
   * 2. Upload files to Cloudinary
   * 3. Store document records
   * 4. Update onboarding progress
   * 5. Mark step as completed
   *
   * @param userId - User ID
   * @param idFrontBuffer - Front of ID image
   * @param idBackBuffer - Back of ID image
   * @param idFrontName - Original file name
   * @param idBackName - Original file name
   * @param dto - ID verification data (name, state code, etc.)
   *
   * @returns Updated onboarding progress
   *
   * @throws NotFoundException - If onboarding not found
   * @throws BadRequestException - If file validation fails
   *
   * @example
   * const progress = await sellerOnboardingService.submitIdVerification(
   *   userId,
   *   idFrontBuffer,
   *   idBackBuffer,
   *   'id_front.jpg',
   *   'id_back.jpg',
   *   {
   *     fullName: 'John Doe',
   *     stateCode: 'OS/24B/1234',
   *     ppaLga: 'Osogbo',
   *     idType: 'DRIVER_LICENSE'
   *   }
   * );
   */
  async submitIdVerification(
    userId: string,
    idFrontBuffer: Buffer,
    idBackBuffer: Buffer,
    idFrontName: string,
    idBackName: string,
    dto: SubmitIdVerificationDto,
  ) {
    this.logger.debug(`Submitting ID verification for user: ${userId}`);

    const onboarding = await this.getProgress(userId);

    if (onboarding.isIdVerificationCompleted) {
      throw new BadRequestException('ID already submitted');
    }

    this.cloudinaryService.validateFile(idFrontBuffer, idFrontName);
    this.cloudinaryService.validateFile(idBackBuffer, idBackName);

    const folder = `seller/${userId}/id_verification`;
    const tags = ['seller', 'id_verification', userId];

    const uploadedFiles: { publicId: string }[] = [];

    try {
      // 1. Upload files first
      const idFrontUpload = await this.cloudinaryService.uploadFile(
        idFrontBuffer,
        idFrontName,
        folder,
        tags,
      );

      const idBackUpload = await this.cloudinaryService.uploadFile(
        idBackBuffer,
        idBackName,
        folder,
        tags,
      );

      uploadedFiles.push(
        { publicId: idFrontUpload.publicId },
        { publicId: idBackUpload.publicId },
      );

      // 2. DB transaction only handles database state
      const result = await this.dataSource.transaction(async (manager) => {
        const documentRepo = manager.getRepository(SellerOnboardingDocument);
        const onboardingRepo = manager.getRepository(SellerOnboardingProgress);

        const onboardingInTx = await onboardingRepo.findOne({
          where: { id: onboarding.id },
        });
        if (!onboardingInTx) {
          throw new Error('Onboarding not found in transaction');
        }

        const idFrontDoc = documentRepo.create({
          onboardingProgressId: onboardingInTx.id,
          documentType: DocumentType.ID_FRONT,
          cloudinaryPublicId: idFrontUpload.publicId,
          cloudinaryUrl: idFrontUpload.secureUrl,
          cloudinaryThumbnailUrl: idFrontUpload.thumbnailUrl,
          originalFileName: idFrontName,
          fileSize: idFrontUpload.fileSize,
          dimensions: idFrontUpload.dimensions,
          format: idFrontUpload.format,
          cloudinaryMetadata: idFrontUpload.metadata,
        });

        const idBackDoc = documentRepo.create({
          onboardingProgressId: onboardingInTx.id,
          documentType: DocumentType.ID_BACK,
          cloudinaryPublicId: idBackUpload.publicId,
          cloudinaryUrl: idBackUpload.secureUrl,
          cloudinaryThumbnailUrl: idBackUpload.thumbnailUrl,
          originalFileName: idBackName,
          fileSize: idBackUpload.fileSize,
          dimensions: idBackUpload.dimensions,
          format: idBackUpload.format,
          cloudinaryMetadata: idBackUpload.metadata,
        });

        await documentRepo.save([idFrontDoc, idBackDoc]);

        onboardingInTx.isIdVerificationCompleted = true;
        onboardingInTx.idVerificationData = {
          fullName: dto.fullName,
          stateCode: dto.stateCode,
          ppaLga: dto.ppaLga,
          idType: dto.idType,
          idNumber: dto.idNumber,
          idFrontUrl: idFrontUpload.secureUrl,
          idBackUrl: idBackUpload.secureUrl,
        };

        onboardingInTx.stepsCompleted = this.setBit(
          onboardingInTx.stepsCompleted,
          0,
        );

        if (
          onboardingInTx.status === SellerVerificationStatusEnum.NOT_STARTED
        ) {
          onboardingInTx.status = SellerVerificationStatusEnum.IN_PROGRESS;
        }

        await onboardingRepo.save(onboardingInTx);

        return onboardingInTx;
      });

      return result;
    } catch (error) {
      // 3. COMPENSATION: cleanup Cloudinary if DB fails
      for (const file of uploadedFiles) {
        try {
          await this.cloudinaryService.deleteFile(file.publicId);
        } catch (cleanupError) {
          this.logger.error(
            `Failed to cleanup Cloudinary file: ${file.publicId}`,
            cleanupError,
          );
        }
      }

      this.logger.error(
        `ID verification failed for user ${userId}`,
        error instanceof Error ? error.stack : undefined,
      );

      throw error;
    }
  }

  /**
   * Submit Step 2: Face Verification (Selfie)
   *
   * Upload selfie for liveness check and face matching.
   * System will compare with ID photo (admin or AI).
   *
   * @param userId - User ID
   * @param selfieBuffer - Selfie image
   * @param selfieName - Original file name
   *
   * @returns Updated onboarding progress
   *
   * @throws BadRequestException - If file validation fails
   *
   * @example
   * const progress = await sellerOnboardingService.submitFaceVerification(
   *   userId,
   *   selfieBuffer,
   *   'selfie.jpg'
   * );
   */

  async submitFaceVerification(
    userId: string,
    selfieBuffer: Buffer,
    selfieName: string,
  ): Promise<SellerOnboardingProgress> {
    this.logger.debug(`Submitting face verification for user: ${userId}`);

    const onboarding = await this.getProgress(userId);

    if (!onboarding.isIdVerificationCompleted) {
      throw new BadRequestException(
        'Complete ID verification before face verification',
      );
    }

    if (onboarding.isFaceVerificationCompleted) {
      throw new BadRequestException('Face verification already submitted');
    }

    this.cloudinaryService.validateFile(selfieBuffer, selfieName);

    const folder = `seller/${userId}/face_verification`;
    const tags = ['seller', 'face_verification', userId];

    let uploadedFile: { publicId: string } | null = null;

    try {
      // 1. Upload to Cloudinary FIRST
      const selfieUpload = await this.cloudinaryService.uploadFile(
        selfieBuffer,
        selfieName,
        folder,
        tags,
      );

      uploadedFile = { publicId: selfieUpload.publicId };

      // 2. DB transaction for consistency
      const result = await this.dataSource.transaction(async (manager) => {
        const documentRepo = manager.getRepository(SellerOnboardingDocument);
        const onboardingRepo = manager.getRepository(SellerOnboardingProgress);

        const onboardingInTx = await onboardingRepo.findOne({
          where: { id: onboarding.id },
        });
        if (!onboardingInTx) {
          throw new Error('Onboarding not found in transaction');
        }

        const selfieDoc = documentRepo.create({
          onboardingProgressId: onboardingInTx.id,
          documentType: DocumentType.SELFIE,
          cloudinaryPublicId: selfieUpload.publicId,
          cloudinaryUrl: selfieUpload.secureUrl,
          cloudinaryThumbnailUrl: selfieUpload.thumbnailUrl,
          originalFileName: selfieName,
          fileSize: selfieUpload.fileSize,
          dimensions: selfieUpload.dimensions,
          format: selfieUpload.format,
          cloudinaryMetadata: selfieUpload.metadata,
        });

        await documentRepo.save(selfieDoc);

        onboardingInTx.isFaceVerificationCompleted = true;
        onboardingInTx.faceVerificationData = {
          selfieUrl: selfieUpload.secureUrl,
          submittedAt: new Date(),
        };

        onboardingInTx.stepsCompleted = this.setBit(
          onboardingInTx.stepsCompleted,
          1,
        );
        onboardingInTx.currentStep = 3;

        await onboardingRepo.save(onboardingInTx);

        return onboardingInTx;
      });

      return result;
    } catch (error) {
      // 3. COMPENSATION: delete uploaded file if DB fails
      if (uploadedFile?.publicId) {
        try {
          await this.cloudinaryService.deleteFile(uploadedFile.publicId);
        } catch (cleanupError) {
          this.logger.error(
            `Failed to cleanup selfie upload: ${uploadedFile.publicId}`,
            cleanupError,
          );
        }
      }

      this.logger.error(
        `Face verification submission failed for user ${userId}`,
        error instanceof Error ? error.stack : undefined,
      );

      throw error;
    }
  }

  /**
   * Submit Step 3: Store Profile
   *
   * Fill in store information and upload store logo.
   * Logo is stored on Cloudinary with CDN delivery.
   *
   * @param userId - User ID
   * @param storeLogoBuffer - Store logo image
   * @param storeLogoName - Original file name
   * @param dto - Store profile data
   *
   * @returns Updated onboarding progress
   *
   * @example
   * const progress = await sellerOnboardingService.submitStoreProfile(
   *   userId,
   *   logoBuffer,
   *   'logo.png',
   *   {
   *     storeName: 'Kopa Kicks & Wears',
   *     state: 'Osun',
   *     lga: 'Osogbo',
   *     whatsappNumber: '09131365115',
   *     deliveryPreferences: ['Camp Meetup']
   *   }
   * );
   */

  async submitStoreProfile(
    userId: string,
    storeLogoBuffer: Buffer,
    storeLogoName: string,
    dto: SubmitStoreProfileDto,
  ): Promise<SellerOnboardingProgress> {
    this.logger.debug(`Submitting store profile for user: ${userId}`);

    const onboarding = await this.getProgress(userId);

    // Guards
    if (!onboarding.isFaceVerificationCompleted) {
      throw new BadRequestException(
        'Complete face verification before store profile setup',
      );
    }

    if (onboarding.isStoreProfileCompleted) {
      throw new BadRequestException('Store profile already submitted');
    }

    this.cloudinaryService.validateFile(storeLogoBuffer, storeLogoName);

    const folder = `seller/${userId}/store_profile`;
    const tags = ['seller', 'store_profile', userId];

    let uploadedLogo: { publicId: string } | null = null;

    try {
      // 1. Upload first (external system)
      const logoUpload = await this.cloudinaryService.uploadFile(
        storeLogoBuffer,
        storeLogoName,
        folder,
        tags,
      );

      uploadedLogo = { publicId: logoUpload.publicId };

      // 2. DB transaction (source of truth)
      const result = await this.dataSource.transaction(async (manager) => {
        const documentRepo = manager.getRepository(SellerOnboardingDocument);
        const onboardingRepo = manager.getRepository(SellerOnboardingProgress);

        const onboardingInTx = await onboardingRepo.findOne({
          where: { id: onboarding.id },
        });
        if (!onboardingInTx) {
          throw new Error('Onboarding not found in transaction');
        }

        const logoDoc = documentRepo.create({
          onboardingProgressId: onboardingInTx.id,
          documentType: DocumentType.STORE_LOGO,
          cloudinaryPublicId: logoUpload.publicId,
          cloudinaryUrl: logoUpload.secureUrl,
          cloudinaryThumbnailUrl: logoUpload.thumbnailUrl,
          originalFileName: storeLogoName,
          fileSize: logoUpload.fileSize,
          dimensions: logoUpload.dimensions,
          format: logoUpload.format,
          cloudinaryMetadata: logoUpload.metadata,
        });

        await documentRepo.save(logoDoc);

        onboardingInTx.isStoreProfileCompleted = true;
        onboardingInTx.storeProfileData = {
          storeName: dto.storeName,
          state: dto.state,
          lga: dto.lga,
          whatsappNumber: dto.whatsappNumber,
          deliveryPreferences: dto.deliveryPreferences,
          storeLogoUrl: logoUpload.secureUrl,
        };

        onboardingInTx.stepsCompleted = this.setBit(
          onboardingInTx.stepsCompleted,
          2,
        );
        onboardingInTx.currentStep = 4;
        onboardingInTx.status = SellerVerificationStatusEnum.PENDING_REVIEW;
        onboardingInTx.completedAt = new Date();

        await onboardingRepo.save(onboardingInTx);

        return onboardingInTx;
      });

      return result;
    } catch (error) {
      // 3. COMPENSATION: rollback Cloudinary upload if DB fails
      if (uploadedLogo?.publicId) {
        try {
          await this.cloudinaryService.deleteFile(uploadedLogo.publicId);
        } catch (cleanupError) {
          this.logger.error(
            `Failed to cleanup store logo: ${uploadedLogo.publicId}`,
            cleanupError,
          );
        }
      }

      this.logger.error(
        `Store profile submission failed for user ${userId}`,
        error instanceof Error ? error.stack : undefined,
      );

      throw error;
    }
  }
  /**
   * Get pending onboarding submissions for admin review
   *
   * Returns all submissions awaiting admin verification.
   * Used in admin dashboard.
   *
   * @returns Array of pending onboarding records
   *
   * @example
   * const pending = await sellerOnboardingService.getPendingReviews();
   * pending.forEach(onboarding => {
   *   console.log(onboarding.user.email);
   *   console.log(onboarding.storeProfileData.storeName);
   * });
   */
  async getPendingReviews(): Promise<SellerOnboardingProgress[]> {
    return this.onboardingProgressRepository.find({
      where: { status: SellerVerificationStatusEnum.PENDING_REVIEW },
      relations: ['user', 'documents'],
      order: { createdAt: 'ASC' },
    });
  }

  /**
   * Bitmap utility: Set bit at position
   * Used for tracking completed steps
   *
   * @param value - Current bitmap value
   * @param position - Bit position (0-3 for 4 steps)
   * @returns Updated bitmap value
   *
   * @private
   */
  private setBit(value: number, position: number): number {
    return value | (1 << position);
  }
}
