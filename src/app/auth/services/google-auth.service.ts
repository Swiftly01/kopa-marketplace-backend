import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { GoogleUser } from '../../common/types/google-user.interface';
import {
  AuthProvider,
  OAuthAccount,
} from '../../domain/users/entities/oauth-account.entity';
import { User } from '../../domain/users/entities/user.entity';
import * as bcrypt from 'bcryptjs';
import { OauthAuthResult } from '../../common/types/oauth-auth-result.interface';

@Injectable()
export class GoogleOAuthService {
  private readonly logger = new Logger(GoogleOAuthService.name);
  private readonly saltRounds = 12;

  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    @InjectRepository(OAuthAccount)
    private readonly googleOAuthRepository: Repository<OAuthAccount>,
  ) {}

  /**
   * Authenticate or create user from Google profile
   
   * @param googleProfile - User data from Google OAuth strategy
   * @returns User object with Google OAuth data
   *
   * @throws BadRequestException - Invalid profile data
   *
   */
  async findOrCreateUser(googleProfile: GoogleUser): Promise<OauthAuthResult> {
    const { providerId, email, firstName, lastName, profilePicture } =
      googleProfile;

    if (!providerId || !email) {
      throw new BadRequestException('Invalid Google profile');
    }

    return this.dataSource.transaction(async (manager) => {
      const userRepo = manager.getRepository(User);
      const oauthRepo = manager.getRepository(OAuthAccount);

      try {
        // 1. Check existing OAuth
        let oauth = await oauthRepo.findOne({
          where: {
            provider: AuthProvider.GOOGLE,
            providerId,
          },
          relations: ['user'],
        });

        if (oauth) {
          const user = oauth.user;

          if (!user.firstName) user.firstName = firstName;
          if (!user.lastName) user.lastName = lastName;

          user.lastLoginAt = new Date();

          oauth.email = email;
          oauth.profilePicture = profilePicture;
          oauth.lastLoginAt = new Date();

          await userRepo.save(user);
          await oauthRepo.save(oauth);

          return { user, oauthAccount: oauth, isNewUser: false };
        }

        // 2. Check existing user by email
        let user = await userRepo.findOne({ where: { email } });

        if (user) {
          const oauth = oauthRepo.create({
            provider: AuthProvider.GOOGLE,
            providerId,
            email,
            profilePicture,
            user,
            userId: user.id,
            lastLoginAt: new Date(),
          });

          await oauthRepo.save(oauth);

          user.lastLoginAt = new Date();
          await userRepo.save(user);

          return { user, oauthAccount: oauth, isNewUser: false };
        }

        // 3. Create new user
        user = userRepo.create({
          email,
          firstName,
          lastName,
          password: null,
          isEmailVerified: true,
          lastLoginAt: new Date(),
        });

        user = await userRepo.save(user);

        oauth = oauthRepo.create({
          provider: AuthProvider.GOOGLE,
          providerId,
          email,
          profilePicture,
          user,
          userId: user.id,
          lastLoginAt: new Date(),
        });

        await oauthRepo.save(oauth);

        return { user, oauthAccount: oauth, isNewUser: true };
      } catch (error: unknown) {
        if (typeof error === 'object' && error !== null && 'code' in error) {
          const dbError = error as { code: string };

          if (dbError.code === '23505') {
            this.logger.warn(
              `Duplicate OAuth detected for providerId: ${providerId}`,
            );

            const existing = await oauthRepo.findOne({
              where: {
                provider: AuthProvider.GOOGLE,
                providerId,
              },
              relations: ['user'],
            });

            if (existing) {
              return {
                user: existing.user,
                oauthAccount: existing,
                isNewUser: false,
              };
            }
          }
        }

        throw error;
      }
    });
  }

  /**
   * Check if Google OAuth is linked to user
   *
   * @param userId - User ID
   * @param googleId - Google OAuth ID
   * @returns true if linked, false otherwise
   *
   */
  async isGoogleOAuthLinked(
    userId: string,
    providerId: string,
  ): Promise<boolean> {
    const googleOAuth = await this.googleOAuthRepository.findOne({
      where: { userId, providerId, provider: AuthProvider.GOOGLE },
    });

    return !!googleOAuth;
  }

  /**
   * Get all Google OAuth accounts for a user
   *
   * User can have multiple Google accounts linked.
   * Returns them sorted by last login (newest first).
   *
   * @param userId - User ID
   * @returns Array of Google OAuth connections
   
   */
  async getUserGoogleOAuthAccounts(userId: string): Promise<OAuthAccount[]> {
    return this.googleOAuthRepository.find({
      where: { userId, provider: AuthProvider.GOOGLE },
      order: { lastLoginAt: 'DESC' },
    });
  }

  /**
   * Unlink Google OAuth account from user
   *
   * @param userId - User ID
   * @param googleId - Google OAuth ID
   * @returns Success message
   *
   * @throws NotFoundException - No such connection
   * @throws BadRequestException - Cannot unlink if no password set
   *
   */
  async unlinkGoogleOAuth(
    userId: string,
    providerId: string,
  ): Promise<{ message: string }> {
    return this.dataSource.transaction(async (manager) => {
      const oauthRepo = manager.getRepository(OAuthAccount);

      const oauth = await oauthRepo.findOne({
        where: {
          userId,
          providerId,
          provider: AuthProvider.GOOGLE,
        },
        relations: ['user'],
      });

      if (!oauth) {
        throw new NotFoundException('Google OAuth connection not found');
      }

      if (!oauth.user.password) {
        throw new BadRequestException('Set a password before unlinking OAuth');
      }

      await oauthRepo.remove(oauth);

      return {
        message: 'Google OAuth account disconnected successfully.',
      };
    });
  }

  /**
   * Set password for OAuth-only user
   *
   * OAuth-only users can add password-based login as fallback.
   * Allows user to login without Google if needed.
   *
   * @param userId - User ID
   * @param password - New password (will be hashed)
   * @returns Success message
   *
   * @throws NotFoundException - User not found
   * @throws BadRequestException - Password already set
   *
   * @example
   * await googleOAuthService.setPasswordForOAuthUser(
   *   'user-uuid',
   *   'SecurePass123!'
   * );
   */
  async setPasswordForOAuthUser(
    userId: string,
    password: string,
  ): Promise<any> {
    const user = await this.userRepository.findOne({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.password) {
      throw new BadRequestException('Password already set for this user');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, this.saltRounds);
    user.password = hashedPassword;
    await this.userRepository.save(user);

    this.logger.log(`Password set for OAuth user: ${userId}`);

    return {
      message:
        'Password set successfully. You can now login with email/password.',
    };
  }

  /**
   * Get user profile with all OAuth connections
   * @param userId - User ID
   * @returns User with their Google OAuth accounts
   *
   */
  async getUserWithOAuthConnections(userId: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { id: userId },
      relations: ['oauthAccounts'],
    });
  }
}
