import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StringValue } from 'ms';
import { EmailVerificationLog } from '../domain/users/entities/email-verification-log.entity';
import { OAuthAccount } from '../domain/users/entities/oauth-account.entity';
import { OtpLog } from '../domain/users/entities/otp-log.entity';
import { Otp } from '../domain/users/entities/otp.entity';
import { PasswordResetLog } from '../domain/users/entities/password-reset-log.entity';
import { User } from '../domain/users/entities/user.entity';
import { EmailModule } from '../email/email.module';
import { AuthController } from './auth.controller';
import { GoogleOAuthGuard } from './guards/google-auth.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { AuthService } from './services/auth.service';
import { GoogleOAuthService } from './services/google-auth.service';
import { OtpService } from './services/otp.service';
import { GoogleStrategy } from './strategies/google.strategy';
import { JwtStrategy } from './strategies/jwt-strategy';

/**
 * Authentication Module
 *
 * Provides all authentication functionality:
 * - User registration
 * - Email verification
 * - Login/logout
 * - Password reset
 * - OTP management
 * - JWT token handling
 *
 * Dependencies:
 * - JwtModule: For JWT token generation and verification
 * - PassportModule: For authentication strategy integration
 * - TypeOrmModule: For database entity access
 * - ConfigService: For environment variables
 *
 * Exported:
 * - AuthService: Core authentication logic
 * - JwtAuthGuard: Guard for protecting routes
 * - JwtStrategy: Passport strategy for JWT
 */
@Module({
  imports: [
    // Configure JWT module with secret and options
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: configService.get<string>(
            'JWT_EXPIRATION',
            '3600',
          ) as StringValue,
        },
      }),
    }),
    // Passport module for authentication strategies
    PassportModule,
    EmailModule,
    // TypeORM entities
    TypeOrmModule.forFeature([
      User,
      OtpLog,
      Otp,
      EmailVerificationLog,
      PasswordResetLog,
      OAuthAccount,
    ]),
  ],
  providers: [
    AuthService,
    OtpService,
    JwtStrategy,
    GoogleStrategy,
    JwtAuthGuard,
    GoogleOAuthService,
    GoogleOAuthGuard,
  ],
  controllers: [AuthController],
  exports: [AuthService, GoogleOAuthService, JwtAuthGuard, JwtStrategy],
})
export class AuthModule {}
