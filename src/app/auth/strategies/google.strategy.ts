import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback, Profile } from 'passport-google-oauth20';
import { GoogleUser } from '../../common/types/google-user.interface';
import { AuthProvider } from '../../domain/users/entities/oauth-account.entity';

/**
 * Google OAuth Strategy
 *
 * Implements Google OAuth 2.0 authentication using Passport.
 *
 * Flow:
 * 1. User clicks "Login with Google"
 * 2. Redirected to Google consent screen
 * 3. User authorizes our app
 * 4. Google redirects to callback URL with authorization code
 * 5. This strategy exchanges code for tokens
 * 6. Extracts user profile information
 * 7. verify() callback is called with profile data
 */
@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  private readonly logger = new Logger(GoogleStrategy.name);

  constructor(private configService: ConfigService) {
    super({
      // Google OAuth App credentials
      // Get these from Google Cloud Console
      clientID: configService.get<string>('GOOGLE_CLIENT_ID')!,
      clientSecret: configService.get<string>('GOOGLE_CLIENT_SECRET')!,
      callbackURL: configService.get<string>('GOOGLE_CALLBACK_URL')!,

      // Request additional user profile info
      // These are the scopes we're requesting from Google
      scope: ['email', 'profile'],

      // Return raw and JWT from Google
      passReqToCallback: true,
    });
  }

  /**
   * Verify callback
   * @param request - Express request object
   * @param accessToken - Google access token (for API calls)
   * @param refreshToken - Google refresh token (for long-lived access)
   * @param profile - User profile from Google
   * @param done - Callback function
   *
   * The done() callback returns user data to the controller.
   * The controller then handles:
   * - Creating new user if doesn't exist
   * - Linking to existing user if email matches
   * - Generating JWT tokens
   */
  validate(
    request: any,
    accessToken: string,
    refreshToken: string,
    profile: Profile,
    done: VerifyCallback,
  ): void {
    this.logger.debug(
      `Google OAuth validation for user: ${profile.displayName} (${profile.id})`,
    );

    // Extract profile information
    const { id, name, emails, photos } = profile;

    // Build user object from Google profile

    const user: GoogleUser = {
      provider: AuthProvider.GOOGLE,
      providerId: id,
      email: emails?.[0]?.value,
      firstName: name?.givenName ?? '',
      lastName: name?.familyName ?? '',
      profilePicture: photos?.[0]?.value ?? null,
      accessToken,
      refreshToken,
    };

    this.logger.log(`Google OAuth validation successful for ${user.email}`);

    // done(error, user, info)
    // null = no error
    // user = authenticated user data (will be attached to req.user)
    done(null, user);
  }
}
