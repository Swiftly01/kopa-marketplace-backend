import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  UploadedFile,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  FileFieldsInterceptor,
  FileInterceptor,
} from '@nestjs/platform-express';
import multer from 'multer';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import type { JwtUser } from '../../common/types/request-with-user.interface';
import { SubmitIdVerificationDto } from './dtos/submit-verification.dto';
import { SellerOnboardingService } from './seller-onboarding.service';
import { SubmitStoreProfileDto } from './dtos/submit-store-profile.dto';

type UploadedFile = Express.Multer.File;

type UploadedFiles = {
  idFront?: UploadedFile[];
  idBack?: UploadedFile[];
};

@Controller('seller/onboarding')
export class SellerOnboardingController {
  constructor(
    private readonly sellerOnboardingService: SellerOnboardingService,
  ) {}

  @Post('initialize')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async initializeOnboarding(@CurrentUser() user: JwtUser): Promise<any> {
    const userId = user.id;
    const progress =
      await this.sellerOnboardingService.initializeOnboarding(userId);

    return {
      message: 'Onboarding initialized successfully',
      id: progress.id,
      currentStep: progress.currentStep,
      status: progress.status,
      stepsCompleted: progress.stepsCompleted,
      isIdVerificationCompleted: progress.isIdVerificationCompleted,
      isFaceVerificationCompleted: progress.isFaceVerificationCompleted,
      isStoreProfileCompleted: progress.isStoreProfileCompleted,
      isAdminVerificationCompleted: progress.isAdminVerificationCompleted,
      idVerificationStatus: progress.idVerificationStatus,
      faceVerificationStatus: progress.faceVerificationStatus,
      storeProfileStatus: progress.storeProfileStatus,
    };
  }

  /**
   * Get Current Onboarding Progress
   *
   * GET /seller/onboarding/progress
   *
   * Retrieve seller's current onboarding status and progress.
   * Shows completed steps, uploaded documents, and any rejection reasons.
   *
   * Requires: JWT authentication (seller)
   *
   * Response:
   * {
   *   "id": "uuid",
   *   "userId": "uuid",
   *   "currentStep": 1-4,
   *   "status": "NOT_STARTED | IN_PROGRESS | PENDING_REVIEW | APPROVED | REJECTED",
   *   "stepsCompleted": 0-15 (bitmap),
   *   "isIdVerificationCompleted": boolean,
   *   "isFaceVerificationCompleted": boolean,
   *   "isStoreProfileCompleted": boolean,
   *   "isAdminVerificationCompleted": boolean,
   *   "rejectionReason": string | null,
   *   "documents": [...],
   *   "storeProfileData": {...},
   *   "createdAt": "2024-01-01T12:00:00Z",
   *   "completedAt": "2024-01-05T15:30:00Z" | null
   * }
   *
   * Use Cases:
   * - Load onboarding form with current step
   * - Show progress to seller
   * - Display rejection reasons
   * - Show uploaded documents
   *
   * @example
   * GET /seller/onboarding/progress
   * Authorization: Bearer <token>
   */

  @Get('progress')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async getProgress(@CurrentUser() user: JwtUser): Promise<any> {
    const userId = user.id;
    const progress = await this.sellerOnboardingService.getProgress(userId);
    return {
      id: progress.id,
      userId: progress.userId,
      currentStep: progress.currentStep,
      status: progress.status,
      stepsCompleted: progress.stepsCompleted,
      isIdVerificationCompleted: progress.isIdVerificationCompleted,
      isFaceVerificationCompleted: progress.isFaceVerificationCompleted,
      isStoreProfileCompleted: progress.isStoreProfileCompleted,
      isAdminVerificationCompleted: progress.isAdminVerificationCompleted,
      idVerificationStatus: progress.idVerificationStatus,
      faceVerificationStatus: progress.faceVerificationStatus,
      storeProfileStatus: progress.storeProfileStatus,
      rejectionReason: progress.rejectionReason,
      documents: progress.documents?.map((doc) => ({
        id: doc.id,
        documentType: doc.documentType,
        cloudinaryUrl: doc.cloudinaryUrl,
        cloudinaryThumbnailUrl: doc.cloudinaryThumbnailUrl,
        verificationStatus: doc.verificationStatus,
        rejectionReason: doc.rejectionReason,
        createdAt: doc.createdAt,
      })),
      storeProfileData: progress.storeProfileData,
      idVerificationData: progress.idVerificationData,
      createdAt: progress.createdAt,
      completedAt: progress.completedAt,
      approvedAt: progress.approvedAt,
    };
  }

  /**
   * Submit Step 1: ID Verification
   *
   * POST /seller/onboarding/id-verification
   * Content-Type: multipart/form-data
   *
   * Upload front and back of national ID or driver's license.
   * Both images required.
   * Max 1MB per image.
   *
   * Form Data:
   * {
   *   "idFront": <binary file>,
   *   "idBack": <binary file>,
   *   "fullName": "John Doe",
   *   "stateCode": "OS/24B/1234",
   *   "ppaLga": "Osogbo",
   *   "idType": "DRIVER_LICENSE | NATIONAL_ID | PASSPORT"
   * }
   *
   * Errors:
   * - 400: File too large, wrong format
   * - 401: Not authenticated
   * - 404: Onboarding not found
   */

  @Post('id-verification')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'idFront', maxCount: 1 },
        { name: 'idBack', maxCount: 1 },
      ],
      { storage: multer.memoryStorage() },
    ),
  )
  @HttpCode(HttpStatus.CREATED)
  async submitIdVerification(
    @CurrentUser() user: JwtUser,
    @UploadedFiles()
    files: UploadedFiles,
    @Body() dto: SubmitIdVerificationDto,
  ) {
    const idFrontFile = files.idFront?.[0];
    const idBackFile = files.idBack?.[0];

    if (!idFrontFile || !idBackFile) {
      throw new BadRequestException('Both ID images required');
    }

    const progress = await this.sellerOnboardingService.submitIdVerification(
      user.id,
      idFrontFile.buffer,
      idBackFile.buffer,
      idFrontFile.originalname,
      idBackFile.originalname,
      dto,
    );

    return {
      message: 'ID verification submitted successfully',
      currentStep: progress.currentStep,
      status: progress.status,
      isIdVerificationCompleted: progress.isIdVerificationCompleted,
    };
  }

  /**
   * Submit Step 2: Face Verification (Selfie)
   *
   * POST /seller/onboarding/face-verification
   * Content-Type: multipart/form-data
   *
   * Upload selfie for liveness check and face matching.
   * System will verify that seller is real person.
   *
   * Form Data:
   * {
   *   "selfie": <binary file>
   * }
   *
   * Requires: JWT authentication (seller)
   * Prerequisite: Step 1 (ID verification) completed
   *
   * Response (201 Created):
   * {
   *   "message": "Face verification submitted successfully",
   *   "currentStep": 3,
   *   "status": "IN_PROGRESS"
   * }
   */

  @Post('face-verification')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileInterceptor('selfie', {
      storage: multer.memoryStorage(),
      limits: { fileSize: 1024 * 1024 }, // 1MB
    }),
  )
  @HttpCode(HttpStatus.CREATED)
  async submitFaceVerification(
    @CurrentUser() user: JwtUser,
    @UploadedFile() file: UploadedFile,
  ) {
    const userId = user.id;

    if (!file) {
      throw new BadRequestException('Selfie image is required');
    }

    const progress = await this.sellerOnboardingService.submitFaceVerification(
      userId,
      file.buffer,
      file.originalname,
    );

    return {
      message: 'Face verification submitted successfully',
      currentStep: progress.currentStep,
      status: progress.status,
      isFaceVerificationCompleted: progress.isFaceVerificationCompleted,
    };
  }

  /**
   * Submit Step 3: Store Profile Setup
   *
   * POST /seller/onboarding/store-profile
   * Content-Type: multipart/form-data
   *
   * Complete seller profile setup with store information.
   * Upload store logo/profile picture.
   *
   * Form Data:
   * {
   *   "storeLogo": <binary file>,
   *   "storeName": "Kopa Kicks & Wears",
   *   "state": "Osun",
   *   "lga": "Osogbo",
   *   "whatsappNumber": "09131365115",
   *   "deliveryPreferences": ["Camp Meetup"] or ["Local Delivery"] or both
   * }
   *
   * Requires: JWT authentication (seller)
   * Prerequisite: Step 2 (Face verification) completed
   *
   * Response (201 Created):
   * {
   *   "message": "Store profile submitted successfully",
   *   "currentStep": 4,
   *   "status": "PENDING_REVIEW",
   *   "completedAt": "2024-01-05T15:30:00Z"
   * }
   *
   
   */

  @Post('store-profile')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileInterceptor('storeLogo', {
      storage: multer.memoryStorage(),
      limits: { fileSize: 1024 * 1024 }, // 1MB
    }),
  )
  @HttpCode(HttpStatus.CREATED)
  async submitStoreProfile(
    @CurrentUser() user: JwtUser,
    @UploadedFile() file: UploadedFile,
    @Body() dto: SubmitStoreProfileDto,
  ): Promise<any> {
    const userId = user.id;

    if (!file) {
      throw new BadRequestException('Store logo is required');
    }

    const progress = await this.sellerOnboardingService.submitStoreProfile(
      userId,
      file.buffer,
      file.originalname,
      dto,
    );

    return {
      message: 'Store profile submitted successfully',
      currentStep: progress.currentStep,
      status: progress.status,
      isStoreProfileCompleted: progress.isStoreProfileCompleted,
      completedAt: progress.completedAt,
      storeProfileData: progress.storeProfileData,
    };
  }

  /**
   * Get Pending Onboarding Submissions (Admin)
   *
   * GET /seller/onboarding/admin/pending
   *
   * Get all seller onboarding submissions awaiting admin review.
   * Used in admin dashboard to view pending applications.
   *
   * Requires: Admin authentication (future implementation)
   *
   * Response:
   * {
   *   "submissions": [
   *     {
   *       "id": "uuid",
   *       "user": { "id", "email", "firstName", "lastName" },
   *       "storeProfileData": {...},
   *       "idVerificationData": {...},
   *       "documents": [...],
   *       "completedAt": "2024-01-05T15:30:00Z"
   *     },
   *     ...
   *   ]
   * }
   */
  @Get('admin/pending')
  @HttpCode(HttpStatus.OK)
  async getPendingReviews(): Promise<any> {
    const submissions = await this.sellerOnboardingService.getPendingReviews();

    return {
      count: submissions.length,
      submissions: submissions.map((sub) => ({
        id: sub.id,
        userId: sub.userId,
        user: {
          id: sub.user.id,
          email: sub.user.email,
          firstName: sub.user.firstName,
          lastName: sub.user.lastName,
        },
        storeProfileData: sub.storeProfileData,
        idVerificationData: sub.idVerificationData,
        documents: sub.documents?.map((doc) => ({
          id: doc.id,
          documentType: doc.documentType,
          cloudinaryUrl: doc.cloudinaryUrl,
          cloudinaryThumbnailUrl: doc.cloudinaryThumbnailUrl,
          createdAt: doc.createdAt,
        })),
        completedAt: sub.completedAt,
      })),
    };
  }
}
