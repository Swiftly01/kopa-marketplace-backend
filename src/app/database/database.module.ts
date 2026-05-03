import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../domain/users/entities/user.entity';
import { OtpLog } from '../domain/users/entities/otp-log-entity';
import { EmailVerificationLog } from '../domain/users/entities/email-verification-log.entity';
import { PasswordResetLog } from '../domain/users/entities/password-reset-log.entity';
import { SellerOnboardingDocument } from '../domain/sellers/entities/seller-onboarding-document.entity';
import { SellerOnboardingProgress } from '../domain/sellers/entities/seller-onboarding-progress.entity';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        entities: [
          User,
          OtpLog,
          EmailVerificationLog,
          PasswordResetLog,
          SellerOnboardingDocument,
          SellerOnboardingProgress,
        ],
        autoLoadEntities: configService.get('database.autoloadEntities'),
        synchronize: configService.get('database.synchronize'),
        port: +configService.get('database.port'),
        username: configService.get('database.user'),
        password: configService.get('database.password'),
        host: configService.get('database.host'),
        database: configService.get('database.name'),
      }),
    }),
  ],
})
export class DatabaseModule {}
