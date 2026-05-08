import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, ExtractJwt } from 'passport-jwt';
import { UserRole } from '../../common/enums/roles-enum';

type AuthJwtPayload = {
  sub: string;
  email: string;
  role: UserRole;
  type: 'access' | 'refresh';
};

/**
 * JWT Strategy for Passport
 *
 * Implements JWT authentication using Passport.
 * Validates JWT tokens and extracts user information.
 *
 * Flow:
 * 1. Extract JWT from Authorization header (Bearer token)
 * 2. Verify signature using JWT secret
 * 3. Validate token hasn't expired
 * 4. Extract and return user payload
 *
 * Used by @UseGuards(JwtAuthGuard) decorator on routes.
 *
 * Configuration:
 * - Reads JWT_SECRET from environment
 * - Expects token format: "Bearer <token>"
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      // Reject expired tokens
      ignoreExpiration: false,
      // Secret key for token verification
      secretOrKey: configService.get<string>('JWT_SECRET', 'defaultSecret'),
    });
  }

  /**
   * Validate JWT payload
   *
   * Called after JWT signature and expiration are verified.
   * Additional validation can be added here.
   *
   * @param payload - Decoded JWT payload
   * @returns User info for request context
   *
   * @example
   * Payload structure:
   * {
   *   sub: "user-id",
   *   email: "user@example.com",
   *   type: "access",
   *   iat: 1234567890,
   *   exp: 1234571490
   * }
   */
  validate(payload: AuthJwtPayload): {
    id: string;
    email: string;
    role: UserRole;
  } {
    //console.log('JWT PAYLOAD:', payload);

    // Check if token type is 'access'
    if (payload.type !== 'access') {
      throw new UnauthorizedException('Invalid token type');
    }

    // Return user object for request context
    // This will be available as request.user
    return {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
    };
  }
}
