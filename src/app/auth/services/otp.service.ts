import { Injectable, Logger } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';

/**
 * OTP Service
 *
 * Handles secure OTP generation, hashing, and verification.
 *
 * This service ensures:
 * - OTPs are never stored in plain text
 * - Secure comparison using bcrypt
 */
@Injectable()
export class OtpService {
  private readonly logger = new Logger(OtpService.name);

  /**
   * Generate a 6-digit numeric OTP
   *
   * Flow:
   * 1. Generate random number between 100000–999999
   * 2. Convert to string
   * 3. Return OTP (to be sent to user)
   *
   * @returns 6-digit OTP string
   *
   * @example
   * const otp = this.otpService.generateOtp();
   * // "483920"
   */
  generateOtp(): string {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    this.logger.debug(`Generated OTP: ${otp}`);
    return otp;
  }

  /**
   * Hash OTP before storing in database
   *
   * Flow:
   * 1. Receive plain OTP
   * 2. Hash using bcrypt
   * 3. Return hashed value for storage
   *
   * @param otp - Plain OTP
   * @returns Hashed OTP
   *
   * @example
   * const hash = await this.hashOtp("123456");
   */
  async hashOtp(otp: string): Promise<string> {
    return bcrypt.hash(otp, 10);
  }

  /**
   * Verify user-provided OTP against stored hash
   *
   * Flow:
   * 1. User submits OTP (inputOtp)
   * 2. Retrieve hashed OTP from database
   * 3. Compare using bcrypt.compare()
   * 4. Return true if match, false otherwise
   *
   * @param inputOtp - OTP entered by user
   * @param storedHash - Hashed OTP from database
   *
   * @returns true if OTP is valid
   *
   * @example
   * const isValid = await this.verifyOtp("123456", storedHash);
   */
  async verifyOtp(inputOtp: string, storedHash: string): Promise<boolean> {
    const isValid = await bcrypt.compare(inputOtp, storedHash);
    this.logger.debug(`OTP verification result: ${isValid}`);
    return isValid;
  }
}
