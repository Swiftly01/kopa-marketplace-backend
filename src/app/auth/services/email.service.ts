import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { SendMailOptions, Transporter } from 'nodemailer';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter!: Transporter;

  constructor(private configService: ConfigService) {
    this.initializeTransporter();
  }

  /**
   * Initialize email transporter with SMTP configuration
   * Called during service initialization
   */
  private initializeTransporter(): void {
    this.transporter = nodemailer.createTransport({
      host: this.configService.get<string>('MAIL_HOST'),
      port: this.configService.get<number>('MAIL_PORT'),
      secure: this.configService.get<number>('MAIL_PORT') === 465,
      auth: {
        user: this.configService.get<string>('MAIL_USER'),
        pass: this.configService.get<string>('MAIL_PASSWORD'),
      },
    });
  }

  /**
   * Send email verification email
   *
   * @param email - Recipient email address
   * @param verificationToken - Token to include in verification link
   * @param appUrl - Base URL of the application
   *
   * @example
   * await emailService.sendVerificationEmail(
   *   'user@example.com',
   *   'token123',
   *   'http://localhost:3000'
   * );
   */

  async sendVerificationEmail(
    email: string,
    verificationToken: string,
    appUrl: string,
  ): Promise<void> {
    const verificationLink = `${appUrl}/auth/verify-email?token=${verificationToken}&email=${email}`;

    const htmlContent = `
      <h2>Email Verification</h2>
      <p>Hello,</p>
      <p>Thank you for registering with us. Please verify your email address by clicking the link below:</p>
      <p>
        <a href="${verificationLink}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
          Verify Email
        </a>
      </p>
      <p>Or copy and paste this link in your browser:</p>
      <p>${verificationLink}</p>
      <p>This link will expire in 24 hours.</p>
      <p>If you didn't register for this account, please ignore this email.</p>
      <p>Best regards,<br>The Auth System Team</p>
    `;

    const textContent = `
      Email Verification
      Thank you for registering with us. Please verify your email address by visiting:
      ${verificationLink}
      This link will expire in 24 hours.
      If you didn't register for this account, please ignore this email.
    `;

    await this.sendEmail(
      email,
      'Email Verification ',
      textContent,
      htmlContent,
    );
  }

  /**
   * Send password reset email
   *
   * @param email - Recipient email address
   * @param resetToken - Token to include in reset link
   * @param appUrl - Base URL of the application
   *
   * @example
   * await emailService.sendPasswordResetEmail(
   *   'user@example.com',
   *   'resetToken123',
   *   'http://localhost:3000'
   * );
   */
  async sendPasswordResetEmail(
    email: string,
    resetToken: string,
    appUrl: string,
  ): Promise<void> {
    const resetLink = `${appUrl}/auth/reset-password?token=${resetToken}&email=${email}`;

    const htmlContent = `
      <h2>Password Reset Request</h2>
      <p>Hello,</p>
      <p>We received a request to reset the password for your account. Click the link below to reset your password:</p>
      <p>
        <a href="${resetLink}" style="background-color: #28a745; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
          Reset Password
        </a>
      </p>
      <p>Or copy and paste this link in your browser:</p>
      <p>${resetLink}</p>
      <p>This link will expire in 1 hour.</p>
      <p>If you didn't request a password reset, please ignore this email.</p>
      <p>Best regards,<br>The Auth System Team</p>
    `;

    const textContent = `
      Password Reset Request
      We received a request to reset the password for your account. Visit this link to reset your password:
      ${resetLink}
      This link will expire in 1 hour.
      If you didn't request a password reset, please ignore this email.
    `;

    await this.sendEmail(email, 'Password Reset', textContent, htmlContent);
  }

  /**
   * Send OTP (One-Time Password) via email
   *
   * @param email - Recipient email address
   * @param otp - 6-digit OTP code
   * @param purpose - Purpose of OTP (LOGIN, SETUP, RESET)
   *
   * @example
   * await emailService.sendOtpEmail('user@example.com', '123456', 'LOGIN');
   */
  async sendOtpEmail(email: string, otp: string, purpose: string = 'LOGIN') {
    const purposeText = {
      VERIFY_EMAIL: 'To verify your email',
      LOGIN: 'To sign in to your account',
      SETUP: 'To enable two-factor authentication',
      RESET: 'To reset your password',
    };

    const htmlContent = `
      <h2>Your One-Time Password (OTP)</h2>
      <p>Hello,</p>
      <p>Use the OTP below ${purposeText[purpose] || 'for authentication'}:</p>
      <h1 style="background-color: #f0f0f0; padding: 20px; text-align: center; font-size: 32px; letter-spacing: 2px; border-radius: 5px;">
        ${otp}
      </h1>
      <p>This OTP will expire in 10 minutes.</p>
      <p>If you didn't request this OTP, please ignore this email and ensure your account is secure.</p>
      <p>Best regards,<br>The Auth System Team</p>
    `;

    const textContent = `
      Your One-Time Password (OTP)
      Use the OTP below ${purposeText[purpose] || 'for authentication'}:
      ${otp}
      This OTP will expire in 10 minutes.
      If you didn't request this OTP, please ignore this email.
    `;

    await this.sendEmail(email, `Your OTP Code`, textContent, htmlContent);
  }

  /**
   * Generic send email method
   * Used internally by other methods
   *
   * @param to - Recipient email address
   * @param subject - Email subject
   * @param text - Plain text content
   * @param html - HTML content (optional)
   *
   * @throws Error if email sending fails
   */
  private async sendEmail(
    to: string,
    subject: string,
    text: string,
    html?: string,
  ): Promise<void> {
    const messageId = await this.sendMailSafe({
      from: this.configService.get<string>('MAIL_FROM'),
      to,
      subject,
      text,
      html,
    });

    this.logger.log(
      `Email sent successfully to ${to}. Message ID: ${messageId}`,
    );
  }

  /**
   * Verify email configuration and connectivity
   *
   * @throws Error if transporter cannot connect
   */
  async verifyConnection(): Promise<void> {
    await this.transporter.verify();
    this.logger.log('Email service connected successfully');
  }

  private async sendMailSafe(options: SendMailOptions): Promise<string> {
    // eslint-disable-next-line
    const result = await this.transporter.sendMail(options);

    const messageId = (result as { messageId?: string })?.messageId;

    if (!messageId) {
      throw new Error('Invalid mail response');
    }

    return messageId;
  }
}
