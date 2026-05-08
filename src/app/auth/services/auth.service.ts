import {
  BadGatewayException,
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { emailVerificationStatus } from '../../common/enums/email-verification-status.enum';
import { OTPDeliveryChannel } from '../../common/enums/otp-delivery-method';
import { EmailVerificationLog } from '../../domain/users/entities/email-verification-log.entity';
import { OtpLog } from '../../domain/users/entities/otp-log-entity';
import { Otp, OtpPurpose } from '../../domain/users/entities/otp.entity';
import { PasswordResetLog } from '../../domain/users/entities/password-reset-log.entity';
import { User } from '../../domain/users/entities/user.entity';
import { RegisterDto } from '../dtos/auth-dto';
import { ChangePasswordDto } from '../dtos/change-password-dto';
import { ForgotPasswordDto } from '../dtos/forgot-password-dto';
import { GenerateOtpDto } from '../dtos/generate-otp-dto';
import { LoginDto } from '../dtos/login-dto';
import { ResetPasswordDto } from '../dtos/reset-password-dto';
import { VerifyEmailDto } from '../dtos/verify-email-dto';
import { VerifyOtpDto } from '../dtos/verify-otp-dto';
import { EmailService } from './email.service';
import { OtpService } from './otp.service';
import { StringValue } from 'ms';
import { PaswordResetStatus } from '../../common/enums/password-reset-status.enum';
import { OTPType } from '../../common/enums/otp-type-enum';
import {
  AuthProvider,
  OAuthAccount,
} from '../../domain/users/entities/oauth-account.entity';
import { UserRole } from '../../common/enums/roles-enum';

type JwtPayload = {
  sub: string;
  email: string;
  role: UserRole;
  type: 'access' | 'refresh';
};

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly saltRounds = 10;
  private readonly maxFailedAttempts = 5;
  private readonly lockoutDuration = 15 * 60 * 1000; //   15 minutes
  private readonly emailTokenExpiration = 24 * 60 * 60 * 1000; // 24 hours
  private readonly passwordResetTokenExpiration = 60 * 60 * 1000; // 1 hour
  private readonly otpExpiration = 10 * 60 * 1000; // 10 minutes
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(OtpLog)
    private readonly otpLogRepository: Repository<OtpLog>,
    @InjectRepository(EmailVerificationLog)
    private readonly emailVerificationRepository: Repository<EmailVerificationLog>,
    @InjectRepository(PasswordResetLog)
    private readonly passwordResetLogRepository: Repository<PasswordResetLog>,
    @InjectRepository(OAuthAccount)
    private readonly oauthRepository: Repository<OAuthAccount>,
    @InjectRepository(Otp)
    private readonly otpRepository: Repository<Otp>,
    private readonly emailService: EmailService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly otpService: OtpService,
  ) {}

  /**
   * Register a new user
   *
   * Flow:
   * 1. Validate input
   * 2. Check if email already exists
   * 3. Hash password
   * 4. Create user with email verification token
   * 5. Send verification email
   * 6. Return user data (without password)
   *
   * @param registerDto - Registration data
   * @returns User data and verification email status
   *
   * @throws ConflictException - If email already exists
   * @throws BadRequestException - If validation fails
   */
  async register(registerDto: RegisterDto): Promise<any> {
    const { email, firstName, lastName, password, phoneNumber } = registerDto;

    //Check if user already exists
    const existingUser = await this.userRepository.findOne({
      where: {
        email,
      },
    });

    if (existingUser) {
      throw new ConflictException(
        'Email already registered. Please login or use a different email',
      );
    }

    //Hash password
    const hashedPassword = await bcrypt.hash(password, this.saltRounds);

    //Generate email verification token
    const emailVerificationToken = uuidv4();
    const emailVerificationTokenExpiresAt = new Date(
      Date.now() + this.emailTokenExpiration,
    );

    //Create new user
    const user = this.userRepository.create({
      email,
      firstName,
      lastName,
      password: hashedPassword,
      phoneNumber,
      emailVerificationToken,
      emailVerificationTokenExpiresAt,
      isEmailVerified: false,
      failedLoginAttempts: 0,
    });

    await this.userRepository.save(user);

    // Send verification email
    const appUrl = this.configService.get<string>('APP_URL');
    if (!appUrl) {
      throw new BadGatewayException('APP_URL is not configured');
    }
    await this.emailService.sendVerificationEmail(
      email,
      emailVerificationToken,
      appUrl,
    );

    this.logger.log(`User registered successfully: ${email}`);

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      message:
        'Registration successful. Please check your email to verify your account',
    };
  }

  /**
   * Verify user's email address
   *
   * Flow:
   * 1. Find user by email
   * 2. Verify token matches and hasn't expired
   * 3. Mark email as verified
   * 4. Clear verification token
   *
   * @param verifyEmailDto - Verification token and email
   * @returns Success message
   *
   * @throws BadRequestException - If token invalid or expired
   * @throws NotFoundException - If user not found
   */
  async verifyEmail(verifyEmailDto: VerifyEmailDto): Promise<any> {
    const { email, token } = verifyEmailDto;

    const user = await this.userRepository.findOne({
      where: {
        email,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check if email is already verified
    if (user.isEmailVerified) {
      return { message: 'Email already verified' };
    }

    // verify token
    if (!user.emailVerificationToken || user.emailVerificationToken !== token) {
      throw new BadRequestException('Invalid verification token');
    }
    if (
      !user.emailVerificationTokenExpiresAt ||
      user.emailVerificationTokenExpiresAt < new Date()
    ) {
      throw new BadRequestException(
        'Verification token has expired. Please request a new one',
      );
    }

    user.isEmailVerified = true;
    user.emailVerificationToken = null;
    user.emailVerificationTokenExpiresAt = null;

    await this.userRepository.save(user);

    // Log verification
    await this.emailVerificationRepository.save({
      userId: user.id,
      user,
      token,
      email,
      status: emailVerificationStatus.VERIFIED,
      verifiedAt: new Date(),
    });

    this.logger.log(`Email verified successfully: ${email}`);

    return {
      message: 'Email verified successfully. You can now login.',
    };
  }

  async login(loginDto: LoginDto): Promise<any> {
    const { email, password } = loginDto;

    const user = await this.userRepository.findOne({ where: { email } });

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    //Check if account is locked
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const minutesRemaining = Math.ceil(
        (user.lockedUntil.getTime() - Date.now()) / 60000,
      );

      throw new BadRequestException(
        `Account is locked. Try again in ${minutesRemaining} minutes.`,
      );
    }

    // Check OAuth provider
    const googleOAuth = await this.oauthRepository.findOne({
      where: {
        userId: user.id,
        provider: AuthProvider.GOOGLE,
      },
    });

    // If user is Google-only
    if (googleOAuth && user.password) {
      throw new BadRequestException(
        'This account uses Google login. Please sign in with Google.',
      );
    }

    // Check if email is verified
    if (!user.isEmailVerified) {
      throw new BadRequestException(
        'Please verify your email before logging in.',
      );
    }

    if (user.password) {
      //verify password
      const passwordMatch = await bcrypt.compare(password, user.password);
      if (!passwordMatch) {
        //Increment failed login attempts
        user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;

        if (user.failedLoginAttempts >= this.maxFailedAttempts) {
          user.lockedUntil = new Date(Date.now() + this.lockoutDuration);
          await this.userRepository.save(user);
          throw new BadRequestException(
            `Too many failed login attempts. Account locked for 15 minutes.`,
          );
        }

        await this.userRepository.save(user);
        throw new UnauthorizedException('Invalid email or password');
      }
    } else {
      // No password but also no OAuth → invalid state
      if (!googleOAuth) {
        throw new BadRequestException(
          'No valid login method found for this account',
        );
      }
    }

    const { accessToken, refreshToken } = this.generateTokens(user);

    //update login info
    user.lastLoginAt = new Date();
    user.failedLoginAttempts = 0;
    user.lockedUntil = null;
    await this.userRepository.save(user);

    this.logger.log(`User logged in successfully: ${email}`);

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        phoneNumber: user.phoneNumber,
      },
    };
  }

  /**
   * Request password reset
   *
   * Flow:
   * 1. Find user by email
   * 2. Generate reset token
   * 3. Save token with expiration
   * 4. Send reset email
   * 5. Log the request
   *
   * @param forgotPasswordDto - User's email
   * @returns Success message
   *
   * @throws NotFoundException - If user not found
   */
  async forgotPassword(forgotPasswordDto: ForgotPasswordDto): Promise<any> {
    const { email } = forgotPasswordDto;

    const user = await this.userRepository.findOne({ where: { email } });

    if (!user) {
      this.logger.warn(
        `Password reset requested for non-existent email: ${email}`,
      );
      return {
        message:
          'If the email exists in our system, you will receive password reset instructions.',
      };
    }

    //Generate reset token
    const passwordResetToken = uuidv4();
    const passwordResetTokenExpiresAt = new Date(
      Date.now() + this.passwordResetTokenExpiration,
    );

    //Update user
    user.passwordResetToken = passwordResetToken;
    user.passwordResetTokenExpiresAt = passwordResetTokenExpiresAt;
    await this.userRepository.save(user);

    //Send reset email
    const appUrl = this.configService.get<string>('APP_URL');
    if (!appUrl) {
      throw new BadGatewayException('APP_URL is not configured');
    }

    await this.emailService.sendPasswordResetEmail(
      email,
      passwordResetToken,
      appUrl,
    );

    // Log the request
    await this.passwordResetLogRepository.save({
      userId: user.id,
      user,
      token: passwordResetToken,
      email,
      status: emailVerificationStatus.PENDING,
      expiresAt: passwordResetTokenExpiresAt,
    });

    this.logger.log(`Password reset requested for: ${email}`);

    return {
      message:
        'If the email exists in our system, you will receive password reset instructions.',
    };
  }

  /**
   * Reset user's password
   *
   * Flow:
   * 1. Find user by email
   * 2. Verify reset token and expiration
   * 3. Hash new password
   * 4. Update password
   * 5. Clear reset token
   * 6. Log the completion
   *
   * @param resetPasswordDto - Token, email, and new password
   * @returns Success message
   *
   * @throws BadRequestException - If token invalid or expired
   * @throws NotFoundException - If user not found
   */

  async resetPassword(resetPasswordDto: ResetPasswordDto): Promise<any> {
    const { email, token, newPassword } = resetPasswordDto;

    const user = await this.userRepository.findOne({ where: { email } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    //verify token
    if (user.passwordResetToken !== token) {
      throw new BadRequestException('Invalid reset token');
    }

    if (
      !user.passwordResetTokenExpiresAt ||
      user.passwordResetTokenExpiresAt < new Date()
    ) {
      throw new BadRequestException(
        'Reset token has expired. Please request a new password reset.',
      );
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, this.saltRounds);

    // Update user
    user.password = hashedPassword;
    user.passwordResetToken = null;
    user.passwordResetTokenExpiresAt = null;
    user.failedLoginAttempts = 0;
    user.lockedUntil = null;

    await this.userRepository.save(user);

    //Log completion
    const resetLog = await this.passwordResetLogRepository.findOne({
      where: { token },
    });

    if (resetLog) {
      resetLog.status = PaswordResetStatus.COMPLETED;
      resetLog.completedAt = new Date();
      await this.passwordResetLogRepository.save(resetLog);
    }

    this.logger.log(`Password reset successfully for: ${email}`);

    return {
      message:
        'Password reset successfully. You can now login with your new password.',
    };
  }

  /**
   * Generate and send OTP
   *
   * Flow:
   * 1. Validate user exists
   * 2. Enforce rate limiting (prevent spam)
   * 3. Delete any existing unused OTPs for this purpose
   * 4. Generate new OTP
   * 5. Hash OTP before storing
   * 6. Save OTP with expiration time
   * 7. Send OTP via email/SMS
   * 8. Log OTP generation event
   *
   * @param generateOtpDto - Contains email & delivery method
   * @returns Success message
   *
   * @throws NotFoundException - If user not found
   * @throws BadRequestException - If rate limit exceeded
   */
  async generateOtp(generateOtpDto: GenerateOtpDto): Promise<any> {
    const { email, deliveryMethod = OTPDeliveryChannel.EMAIL } = generateOtpDto;

    const user = await this.userRepository.findOne({ where: { email } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Rate Limit (1 OTP per 60 seconds)
    const recentOtp = await this.otpRepository.findOne({
      where: {
        user: { id: user.id },
        purpose: OtpPurpose.EMAIL_VERIFICATION,
      },
      order: { createdAt: 'DESC' },
    });

    if (recentOtp && Date.now() - recentOtp.createdAt.getTime() < 60000) {
      throw new BadRequestException(
        'Please wait before requesting another OTP',
      );
    }

    // Delete old unused OTPs
    await this.otpRepository.delete({
      user: { id: user.id },
      purpose: OtpPurpose.EMAIL_VERIFICATION,
      isUsed: false,
    });

    //Generate OTP
    const otp = this.otpService.generateOtp();
    const hashedOtp = await this.otpService.hashOtp(otp);

    //store OTP;
    await this.otpRepository.save({
      code: hashedOtp,
      purpose: OtpPurpose.EMAIL_VERIFICATION,
      expiresAt: new Date(Date.now() + this.otpExpiration),
      user,
    });

    // Send OTP via email
    await this.emailService.sendOtpEmail(email, otp, ' VERIFY_EMAIL');

    // Log OTP generation
    await this.otpLogRepository.save({
      userId: user.id,
      user,
      type: OTPType.GENERATE,
      deliveryMethod,
      recipient: email,
    });

    this.logger.log(`OTP generated and sent to ${email}`);

    return {
      message: `OTP sent to ${email}. It will expire in 10 minutes.`,
    };
  }

  /**
   * Verify OTP and authenticate user
   *
   * Flow:
   * 1. Validate user exists
   * 2. Retrieve latest unused OTP
   * 3. Check if OTP exists
   * 4. Check if OTP is expired
   * 5. Compare input OTP with stored hash
   * 6. If invalid:
   *    - Increment attempt count
   *    - Block OTP after max attempts
   * 7. If valid:
   *    - Mark OTP as used
   *    - Generate JWT tokens
   *    - Log success
   *
   * @param verifyOtpDto - Contains email and OTP
   * @returns Auth tokens + success message
   *
   * @throws NotFoundException - If user not found
   * @throws UnauthorizedException - If OTP invalid/expired
   */
  async verifyOtp(verifyOtpDto: VerifyOtpDto): Promise<any> {
    const { email, otp } = verifyOtpDto;

    const user = await this.userRepository.findOne({ where: { email } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const storedOtp = await this.otpRepository.findOne({
      where: {
        user: { id: user.id },
        isUsed: false,
        isBlocked: false,
      },
      order: { createdAt: 'DESC' },
    });

    if (!storedOtp) {
      throw new UnauthorizedException('Invalid OTP');
    }

    // Expired
    if (storedOtp.expiresAt < new Date()) {
      throw new UnauthorizedException('OTP expired');
    }

    const isValid = await this.otpService.verifyOtp(otp, storedOtp?.code);

    if (!isValid) {
      storedOtp.attempts += 1;

      // Block after 5 attempts
      if (storedOtp.attempts >= 5) {
        storedOtp.isBlocked = true;
      }

      await this.otpRepository.save(storedOtp);

      throw new UnauthorizedException('Invalid OTP');
    }

    storedOtp.isUsed = true;
    await this.otpRepository.save(storedOtp);

    // Log successful verification
    await this.otpLogRepository.save({
      userId: user.id,
      user,
      type: OTPType.VERIFY_SUCCESS,
      deliveryMethod: 'EMAIL',
      recipient: email,
    });

    // Generate tokens for login
    const { accessToken, refreshToken } = this.generateTokens(user);

    this.logger.log(`OTP verified successfully for ${email}`);

    return {
      accessToken,
      refreshToken,
      message: 'OTP verified successful.',
    };
  }

  /**
   * Change password (for logged-in users)
   *
   * Flow:
   * 1. Find user
   * 2. Verify current password
   * 3. Hash new password
   * 4. Update password
   * 5. Reset failed attempts and lockout
   *
   * @param userId - User's ID
   * @param changePasswordDto - Current and new passwords
   * @returns Success message
   *
   * @throws UnauthorizedException - If current password incorrect
   */
  async changePassword(
    userId: string,
    changePasswordDto: ChangePasswordDto,
  ): Promise<{ message: string }> {
    const { currentPassword, newPassword } = changePasswordDto;

    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check if account is locked
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      throw new BadRequestException(
        'Account is temporarily locked. Please try again later.',
      );
    }

    // Check if user has password auth enabled
    if (!user.password) {
      throw new BadRequestException(
        'This account does not use password authentication. Please use Google login.',
      );
    }

    // Verify current password
    const passwordMatch = await bcrypt.compare(currentPassword, user.password);

    if (!passwordMatch) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    // Prevent reusing same password
    const isSamePassword = await bcrypt.compare(newPassword, user.password);

    if (isSamePassword) {
      throw new BadRequestException(
        'New password must be different from current password',
      );
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, this.saltRounds);

    // Update user safely
    user.password = hashedPassword;
    user.failedLoginAttempts = 0;
    user.lockedUntil = null;
    user.updatedAt = new Date();

    await this.userRepository.save(user);

    this.logger.log(`Password changed successfully for user: ${userId}`);

    return {
      message: 'Password changed successfully.',
    };
  }
  /**
   * Generate JWT access and refresh tokens
   *
   * @param user - User entity
   * @returns Object with accessToken and refreshToken
   *
   * @private
   */
  generateTokens(user: User) {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      type: 'access',
    };

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: this.configService.get('JWT_EXPIRATION', '1h'),
    });

    const refreshToken = this.jwtService.sign(
      {
        sub: user.id,
        email: user.email,
        role: user.role,
        type: 'refresh',
      },
      {
        expiresIn: '7d',
      },
    );

    return { accessToken, refreshToken };
  }

  /**
   * Refresh access token
   *
   * Flow:
   * 1. Verify refresh token
   * 2. Ensure token type is 'refresh'
   * 3. Fetch user from database
   * 4. Generate new access token
   *
   * @param refreshToken - Valid refresh token
   * @returns New access token
   */
  async refreshAccessToken(
    refreshToken: string,
  ): Promise<{ accessToken: string }> {
    try {
      const decoded = this.jwtService.verify<JwtPayload>(refreshToken);

      if (decoded.type !== 'refresh') {
        throw new UnauthorizedException('Invalid token type');
      }

      const user = await this.userRepository.findOne({
        where: { id: decoded.sub },
      });

      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      const payload: JwtPayload = {
        sub: user.id,
        email: user.email,
        role: user.role,
        type: 'access',
      };

      const expiresIn = this.configService.get<string>(
        'JWT_EXPIRATION',
        '1h',
      ) as StringValue;

      const newAccessToken = this.jwtService.sign(payload, {
        expiresIn,
      });

      return { accessToken: newAccessToken };
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }
}
