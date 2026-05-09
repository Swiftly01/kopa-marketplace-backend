import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './services/auth.service';
import { RegisterDto } from './dtos/auth-dto';
import { VerifyEmailDto } from './dtos/verify-email-dto';
import { LoginDto } from './dtos/login-dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { ForgotPasswordDto } from './dtos/forgot-password-dto';
import { ResetPasswordDto } from './dtos/reset-password-dto';
import { GenerateOtpDto } from './dtos/generate-otp-dto';
import { VerifyOtpDto } from './dtos/verify-otp-dto';
import { RefreshTokenOtpDto } from './dtos/refresh-token-otp-dto';
import { ChangePasswordDto } from './dtos/change-password-dto';
import { GoogleOAuthGuard } from './guards/google-auth.guard';
import { GoogleOAuthService } from './services/google-auth.service';
import type {
  JwtUser,
  RequestWithUser,
} from '../common/types/request-with-user.interface';
import { User } from '../domain/users/entities/user.entity';
import { CurrentUser } from './decorators/current-user.decorator';
import { GoogleUser } from '../common/types/google-user.interface';
import { IsPublic } from './decorators/public.decorator';

@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);
  constructor(
    private readonly authService: AuthService,
    private readonly googleOAuthService: GoogleOAuthService,
  ) {}

  @Post('register')
  @IsPublic()
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() registerDto: RegisterDto): Promise<any> {
    console.log('POST /auth/register hit');
    return this.authService.register(registerDto);
  }

  @Get('verify-email')
  @IsPublic()
  @HttpCode(HttpStatus.OK)
  async verifyEmail(@Query() verifyEmailDto: VerifyEmailDto): Promise<any> {
    return this.authService.verifyEmail(verifyEmailDto);
  }

  @Post('login')
  @IsPublic()
  @HttpCode(HttpStatus.OK)
  async login(@Body() loginDto: LoginDto): Promise<any> {
    return this.authService.login(loginDto);
  }

  @Post('logout')
  @IsPublic()
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  public logout(): { message: string } {
    return {
      message: 'Logged out successfully',
    };
  }

  @Post('forgot-password')
  @IsPublic()
  @HttpCode(HttpStatus.OK)
  async forgotPassword(
    @Body() forgotPasswordDto: ForgotPasswordDto,
  ): Promise<any> {
    return this.authService.forgotPassword(forgotPasswordDto);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(
    @Body() resetPasswordDto: ResetPasswordDto,
  ): Promise<any> {
    return this.authService.resetPassword(resetPasswordDto);
  }

  @IsPublic()
  @Post('generate-otp')
  @HttpCode(HttpStatus.OK)
  async generateOtp(@Body() generateOtpDto: GenerateOtpDto): Promise<any> {
    return this.authService.generateOtp(generateOtpDto);
  }

  @Post('verify-otp')
  @HttpCode(HttpStatus.OK)
  async verifyOtp(@Body() verifyOtpDto: VerifyOtpDto): Promise<any> {
    return this.authService.verifyOtp(verifyOtpDto);
  }

  @Post('refresh-token')
  @HttpCode(HttpStatus.OK)
  async refreshToken(
    @Body() refreshTokenDto: RefreshTokenOtpDto,
  ): Promise<any> {
    return this.authService.refreshAccessToken(refreshTokenDto.refreshToken);
  }

  @Post('change-password')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async changePassword(
    @CurrentUser() user: JwtUser,
    @Body() changePasswordDto: ChangePasswordDto,
  ): Promise<any> {
    return this.authService.changePassword(user.id, changePasswordDto);
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  getProfile(@CurrentUser() user: JwtUser): { user: JwtUser } {
    return {
      user,
    };
  }

  /**
   * Initiate Google OAuth Login
   *
   * GET /auth/google
   *
   * Redirects user to Google consent screen.
   * User logs in, grants permissions, gets redirected to callback.
   *
   * Flow:
   * 1. Click link → redirected to /auth/google
   * 2. Guard triggers GoogleStrategy
   * 3. GoogleStrategy redirects to Google login
   * 4. User approves permissions
   * 5. Google redirects to /auth/google/callback
   */
  @Get('google')
  @UseGuards(GoogleOAuthGuard)
  async googleLogin(): Promise<void> {}

  @Get('google/callback')
  @UseGuards(GoogleOAuthGuard)
  @HttpCode(HttpStatus.OK)
  async googleCallback(@Request() req: RequestWithUser<GoogleUser>): Promise<{
    accessToken: string;
    refreshToken: string;
    user: Partial<User>;
    isNewUser: boolean;
    message: string;
  }> {
    // req.user contains the profile data from GoogleStrategy.validate()
    const googleProfile = req.user;

    // Find or create user in our database
    const { user, isNewUser } =
      await this.googleOAuthService.findOrCreateUser(googleProfile);

    // Generate JWT tokens
    const { accessToken, refreshToken } = this.authService.generateTokens(user);

    this.logger.log(`User logged in via Google: ${user.email}`);

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
      },
      isNewUser,
      message: isNewUser
        ? 'Welcome! Your account has been created.'
        : 'Welcome back!',
    };
  }

  /**
   * Get all Google OAuth connections for user
   *
   * Shows all Google accounts linked to user.
   * Helps user manage their OAuth connections.
   *
   
   */
  @Get('google/connections')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async getGoogleConnections(@CurrentUser() user: JwtUser): Promise<{
    connections: Array<{
      id: string;
      providerId: string;
      email: string;
      picture: string | null;
      lastLoginAt: Date | null;
      connectedAt: Date;
    }>;
  }> {
    const userId = user.id;
    const connections =
      await this.googleOAuthService.getUserGoogleOAuthAccounts(userId);

    return {
      connections: connections.map((conn) => ({
        id: conn.id,
        providerId: conn.providerId,
        email: conn.email,
        picture: conn.profilePicture,
        lastLoginAt: conn.lastLoginAt,
        connectedAt: conn.createdAt,
      })),
    };
  }

  /**
   * Unlink Google OAuth account
   
   * Disconnect Google login from user account.
   * User must have a password set (to login without Google).
   *
   * Requires: Valid JWT token
   
   */
  @Post('unlink-google')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async unlinkGoogleOAuth(
    @CurrentUser() user: JwtUser,
    @Body() body: { googleId: string },
  ): Promise<any> {
    const userId = user.id;
    const { googleId } = body;

    return this.googleOAuthService.unlinkGoogleOAuth(userId, googleId);
  }

  /**
   * Set password for OAuth-only user
   *
   
   * OAuth-only users can add password login option.
   * Allows fallback authentication if Google is unavailable.
   *
   * Requires: Valid JWT token, user must be OAuth-only (no password)
   
   */
  @Post('set-oauth-password')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async setOAuthPassword(
    @CurrentUser() user: JwtUser,
    @Body() body: { password: string },
  ): Promise<any> {
    const userId = user.id;
    const { password } = body;

    return this.googleOAuthService.setPasswordForOAuthUser(userId, password);
  }
}
