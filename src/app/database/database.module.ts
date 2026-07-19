import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../domain/users/entities/user.entity';
import { OtpLog } from '../domain/users/entities/otp-log.entity';
import { EmailVerificationLog } from '../domain/users/entities/email-verification-log.entity';
import { PasswordResetLog } from '../domain/users/entities/password-reset-log.entity';
import { SellerOnboardingDocument } from '../domain/sellers/entities/seller-onboarding-document.entity';
import { SellerOnboardingProgress } from '../domain/sellers/entities/seller-onboarding-progress.entity';
import { Product } from '../domain/products/entities/product.entity';
import { ProductImage } from '../domain/products/entities/product-image.entity';
import { Promotion } from '../domain/promotions/entities/promotion.entity';
import { PromotionClaim } from '../domain/promotions/entities/promotion-claim.entity';
import { DeviceToken } from '../notification/entities/device-token.entity';
import { NotificationPreference } from '../notification/entities/notification-preference.entity';
import { Notification } from '../notification/entities/notification.entity';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const databaseUrl = configService.get<string>('database.url');
        const isProduction =
          configService.get<string>('app.nodeEnv') === 'production';

        return {
          type: 'postgres',
          /**
           * If DATABASE_URL exists (Railway production), use it.
           * Otherwise, use local PostgreSQL settings.
           */
          ...(databaseUrl
            ? {
                url: databaseUrl,
                ssl: isProduction ? { rejectUnauthorized: false } : false,
              }
            : {
                host: configService.get<string>('database.host'),
                port: configService.get<number>('database.port'),
                username: configService.get<string>('database.user'),
                password: configService.get<string>('database.password'),
                database: configService.get<string>('database.name'),
                ssl: false,
              }),
          entities: [
            User,
            OtpLog,
            EmailVerificationLog,
            PasswordResetLog,
            SellerOnboardingDocument,
            SellerOnboardingProgress,
            Product,
            ProductImage,
            Promotion,
            PromotionClaim,
            DeviceToken,
            NotificationPreference,
            Notification,
          ],
          autoLoadEntities: configService.get('database.autoloadEntities'),
          synchronize: configService.get('database.synchronize'),
        };
      },
    }),
  ],
})
export class DatabaseModule {}
