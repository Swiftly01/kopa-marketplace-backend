import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
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

  @Get('initialize')
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

  @Post('id-verification')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'idFront', maxCount: 1 },
        { name: 'idBack', maxCount: 1 },
      ],
      {
        storage: multer.memoryStorage(),
        limits: { fileSize: 5 * 1024 * 1024 },
      },
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

    const progress =
      await this.sellerOnboardingService.createOrUpdateIdVerification(
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

  @Post('face-verification')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileInterceptor('selfie', {
      storage: multer.memoryStorage(),
      limits: { fileSize: 2 * 1024 * 1024 },
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

    const progress = await this.sellerOnboardingService.submitStoreProfile(
      userId,
      file?.buffer,
      file?.originalname,
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

  @Get(':id/progress')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async getSellerOnboardingData(@Param('id') userId: string): Promise<any> {
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
}
