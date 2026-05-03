import { Module } from '@nestjs/common';
import { SellerOnboardingService } from './seller-onboarding.service';
import { SellerOnboardingController } from './seller-onboarding.controller';
import { TypeOrmModule } from '@nestjs/typeorm';

import { User } from '../users/entities/user.entity';
import { SellerOnboardingProgress } from './entities/seller-onboarding-progress.entity';
import { SellerOnboardingDocument } from './entities/seller-onboarding-document.entity';
import { CloudinaryService } from '../../cloudinary/cloudinary.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      SellerOnboardingProgress,
      SellerOnboardingDocument,
    ]),
  ],

  providers: [SellerOnboardingService, CloudinaryService],
  controllers: [SellerOnboardingController],
})
export class SellerModule {}
