import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaginationModule } from '../../common/pagination/pagination.module';
import { SellerOnboardingProgress } from '../sellers/entities/seller-onboarding-progress.entity';
import { User } from '../users/entities/user.entity';
import { AdminController } from './controllers/admin.controller';
import { UserFilterProvider } from './providers/user-filter-provider.service';
import { AdminApprovalService } from './services/admin-approval.service';
import { EmailService } from '../../auth/services/email.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, SellerOnboardingProgress]),
    PaginationModule,
  ],
  providers: [AdminApprovalService, UserFilterProvider, EmailService],
  controllers: [AdminController],
})
export class AdminModule {}
