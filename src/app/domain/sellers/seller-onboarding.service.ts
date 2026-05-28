import {
  BadRequestException,
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
import { CloudinaryUploadResult } from '../../cloudinary/interfaces/cloudinary-upload-result';

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

  async initializeOnboarding(
    userId: string,
  ): Promise<SellerOnboardingProgress> {
    this.logger.debug(`Initializing onboarding for user: ${userId}`);

    let onboarding = await this.onboardingProgressRepository.findOne({
      where: { userId },
    });

    if (onboarding) {
      // Reset existing onboarding instead of throwing or creating new
      onboarding.currentStep = 1;
      onboarding.status = SellerVerificationStatusEnum.NOT_STARTED;
      onboarding.stepsCompleted = 0;

      onboarding = await this.onboardingProgressRepository.save(onboarding);

      this.logger.log(`Onboarding reset for user: ${userId}`);
      return onboarding;
    }

    // Create only if it does not exist
    onboarding = this.onboardingProgressRepository.create({
      userId,
      currentStep: 1,
      status: SellerVerificationStatusEnum.NOT_STARTED,
      stepsCompleted: 0,
    });

    await this.onboardingProgressRepository.save(onboarding);

    this.logger.log(`Onboarding initialized for user: ${userId}`);

    return onboarding;
  }

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

  async createOrUpdateIdVerification(
    userId: string,
    idFrontBuffer: Buffer,
    idBackBuffer: Buffer,
    idFrontName: string,
    idBackName: string,
    dto: SubmitIdVerificationDto,
  ) {
    this.logger.debug(
      `Submitting/Updating ID verification for user: ${userId}`,
    );

    const onboarding = await this.getProgress(userId);

    const folder = `seller/${userId}/id_verification`;
    const tags = ['seller', 'id_verification', userId];

    const uploadedFiles: string[] = [];

    try {
      // 1. Validate files first
      this.cloudinaryService.validateFile(idFrontBuffer, idFrontName);
      this.cloudinaryService.validateFile(idBackBuffer, idBackName);

      // 2. Upload first (outside transaction)
      const [idFrontUpload, idBackUpload] = await Promise.all([
        this.cloudinaryService.uploadFile(
          idFrontBuffer,
          idFrontName,
          folder,
          tags,
        ),
        this.cloudinaryService.uploadFile(
          idBackBuffer,
          idBackName,
          folder,
          tags,
        ),
      ]);

      uploadedFiles.push(idFrontUpload.publicId, idBackUpload.publicId);

      // 3. DB transaction (only DB work)
      const result = await this.dataSource.transaction(async (manager) => {
        const documentRepo = manager.getRepository(SellerOnboardingDocument);
        const onboardingRepo = manager.getRepository(SellerOnboardingProgress);

        const onboardingInTx = await onboardingRepo.findOne({
          where: { id: onboarding.id },
        });

        if (!onboardingInTx) {
          throw new Error('Onboarding not found');
        }

        // 4. UPSERT DOCUMENTS (replace old ones per type)
        const upsertDoc = async (
          type: DocumentType,
          upload: CloudinaryUploadResult,
          originalName: string,
        ) => {
          const existing = await documentRepo.findOne({
            where: {
              onboardingProgressId: onboardingInTx.id,
              documentType: type,
            },
          });

          if (existing) {
            await documentRepo.remove(existing);
          }

          return documentRepo.save(
            documentRepo.create({
              onboardingProgressId: onboardingInTx.id,
              documentType: type,
              cloudinaryPublicId: upload.publicId,
              cloudinaryUrl: upload.secureUrl,
              cloudinaryThumbnailUrl: upload.thumbnailUrl,
              originalFileName: originalName,
              fileSize: upload.fileSize,
              dimensions: upload.dimensions,
              format: upload.format,
              cloudinaryMetadata: upload.metadata,
            }),
          );
        };

        await Promise.all([
          upsertDoc(DocumentType.ID_FRONT, idFrontUpload, idFrontName),
          upsertDoc(DocumentType.ID_BACK, idBackUpload, idBackName),
        ]);

        // 5. Update onboarding state
        onboardingInTx.isIdVerificationCompleted = true;

        onboardingInTx.status =
          onboardingInTx.status === SellerVerificationStatusEnum.NOT_STARTED
            ? SellerVerificationStatusEnum.IN_PROGRESS
            : SellerVerificationStatusEnum.REJECTED
              ? SellerVerificationStatusEnum.IN_PROGRESS
              : onboardingInTx.status;

        onboardingInTx.idVerificationData = {
          fullName: dto.fullName,
          stateCodeNumber: dto.stateCodeNumber,
          stateName: dto.stateName,
          stateCode: dto.stateCode,
          ppaLga: dto.ppaLga,
          idType: dto.idType,
          idNumber: dto.idNumber,
        };

        onboardingInTx.stepsCompleted = this.setBit(
          onboardingInTx.stepsCompleted,
          0,
        );

        await onboardingRepo.save(onboardingInTx);

        return onboardingInTx;
      });

      return result;
    } catch (error) {
      // 6. rollback Cloudinary if DB fails
      await Promise.all(
        uploadedFiles.map(async (publicId) => {
          try {
            await this.cloudinaryService.deleteFile(publicId);
          } catch (e) {
            this.logger.error(`Cloudinary cleanup failed: ${publicId}`, e);
          }
        }),
      );

      this.logger.error(
        `ID verification failed for user ${userId}`,
        error instanceof Error ? error.stack : undefined,
      );

      throw error;
    }
  }

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

    this.cloudinaryService.validateFile(selfieBuffer, selfieName);

    const folder = `seller/${userId}/face_verification`;
    const tags = ['seller', 'face_verification', userId];

    let uploadedFile: { publicId: string } | null = null;

    try {
      // 1. upload first
      const selfieUpload = await this.cloudinaryService.uploadFile(
        selfieBuffer,
        selfieName,
        folder,
        tags,
      );

      uploadedFile = { publicId: selfieUpload.publicId };

      // 2. DB transaction
      const result = await this.dataSource.transaction(async (manager) => {
        const documentRepo = manager.getRepository(SellerOnboardingDocument);
        const onboardingRepo = manager.getRepository(SellerOnboardingProgress);

        const onboardingInTx = await onboardingRepo.findOne({
          where: { id: onboarding.id },
        });

        if (!onboardingInTx) {
          throw new Error('Onboarding not found in transaction');
        }

        // 3. UPSERT SELFIE DOCUMENT (replace old one if exists)
        const existing = await documentRepo.findOne({
          where: {
            onboardingProgressId: onboardingInTx.id,
            documentType: DocumentType.SELFIE,
          },
        });

        if (existing) {
          await documentRepo.remove(existing);
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

        // 4. update onboarding state
        onboardingInTx.isFaceVerificationCompleted = true;

        onboardingInTx.status =
          onboardingInTx.status === SellerVerificationStatusEnum.REJECTED
            ? SellerVerificationStatusEnum.IN_PROGRESS
            : onboardingInTx.status;

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
      // 5. rollback cloudinary
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

  async submitStoreProfile(
    userId: string,
    storeLogoBuffer: Buffer | undefined,
    storeLogoName: string | undefined,
    dto: SubmitStoreProfileDto,
  ): Promise<SellerOnboardingProgress> {
    this.logger.debug(`Submitting/Updating store profile for user: ${userId}`);

    const onboarding = await this.getProgress(userId);

    if (!onboarding.isFaceVerificationCompleted) {
      throw new BadRequestException(
        'Complete face verification before store profile setup',
      );
    }

    const folder = `seller/${userId}/store_profile`;
    const tags = ['seller', 'store_profile', userId];

    let uploadedLogo: { publicId: string } | null = null;

    // OPTIONAL FILE UPLOAD
    let logoUpload: Awaited<
      ReturnType<typeof this.cloudinaryService.uploadFile>
    > | null = null;

    try {
      // upload only if file exists
      if (storeLogoBuffer && storeLogoName) {
        this.cloudinaryService.validateFile(storeLogoBuffer, storeLogoName);

        logoUpload = await this.cloudinaryService.uploadFile(
          storeLogoBuffer,
          storeLogoName,
          folder,
          tags,
        );

        uploadedLogo = { publicId: logoUpload.publicId };
      }

      // DB transaction
      const result = await this.dataSource.transaction(async (manager) => {
        const documentRepo = manager.getRepository(SellerOnboardingDocument);

        const onboardingRepo = manager.getRepository(SellerOnboardingProgress);

        const onboardingInTx = await onboardingRepo.findOne({
          where: { id: onboarding.id },
        });

        if (!onboardingInTx) {
          throw new Error('Onboarding not found in transaction');
        }

        // SAVE STORE LOGO ONLY IF PROVIDED
        if (logoUpload) {
          const existingLogo = await documentRepo.findOne({
            where: {
              onboardingProgressId: onboardingInTx.id,
              documentType: DocumentType.STORE_LOGO,
            },
          });

          if (existingLogo) {
            await documentRepo.remove(existingLogo);
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
        }

        // UPDATE STORE PROFILE
        onboardingInTx.storeProfileData = {
          storeName: dto.storeName,
          whatsappNumber: dto.whatsappNumber,
          deliveryPreferences: dto.deliveryPreferences,
          storeLogoUrl: logoUpload?.secureUrl ?? null,
        };

        onboardingInTx.isStoreProfileCompleted = true;

        onboardingInTx.stepsCompleted = this.setBit(
          onboardingInTx.stepsCompleted,
          2,
        );

        onboardingInTx.currentStep = 4;

        // status logic
        if (onboardingInTx.status === SellerVerificationStatusEnum.REJECTED) {
          onboardingInTx.status = SellerVerificationStatusEnum.IN_PROGRESS;
        }

        const allStepsCompleted =
          onboardingInTx.isIdVerificationCompleted &&
          onboardingInTx.isFaceVerificationCompleted &&
          onboardingInTx.isStoreProfileCompleted;

        if (allStepsCompleted) {
          onboardingInTx.status = SellerVerificationStatusEnum.PENDING_REVIEW;

          onboardingInTx.completedAt = new Date();
        }

        await onboardingRepo.save(onboardingInTx);

        return onboardingInTx;
      });

      return result;
    } catch (error) {
      // rollback cloudinary
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
