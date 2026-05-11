import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
//import { SendMailOptions, Transporter } from 'nodemailer';
//import * as nodemailer from 'nodemailer';
import { Resend } from 'resend';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  //private transporter!: Transporter;
  private readonly resend: Resend;
  private readonly appUrl: string;
  private readonly appName: string;

  constructor(private configService: ConfigService) {
    // this.initializeTransporter();
    this.resend = new Resend(
      this.configService.getOrThrow<string>('RESEND_API_KEY'),
    );
    this.appUrl = configService.get<string>('APP_URL', 'http://localhost:3000');
    this.appName = configService.get<string>('APP_NAME', 'Kopa Marketplace');
  }
  /*
  onModuleInit() {
    this.initializeTransporter();
  }
  */

  /**
   * Initialize email transporter with SMTP configuration
   * Called during service initialization
   */
  /*
  private initializeTransporter(): void {
    const host = this.configService.get<string>('MAIL_HOST');
    const port = Number(this.configService.get<string>('MAIL_PORT'));
    const user = this.configService.get<string>('MAIL_USER');
    const pass = this.configService.get<string>('MAIL_PASSWORD');

    if (!host || !port || !user || !pass) {
      throw new Error(
        'SMTP config missing (MAIL_HOST, MAIL_PORT, MAIL_USER, MAIL_PASSWORD)',
      );
    }

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: {
        user,
        pass,
      },
    });
  }
*/

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
   * Send seller approval email
   *
   * Notifies seller that their verification is complete and approved.
   * Seller can now start creating product listings.
   *
   * @Param  to
   * @param firstName
   * @param storeName
   *
   */
  async sendApprovalEmail(
    to: string,
    firstName: string,
    storeName: string,
  ): Promise<void> {
    const subject = 'Your Seller Account is Approved!';
    // const dashboardUrl = `${this.appUrl}/seller/dashboard`;
    const productsUrl = `${this.appUrl}/seller/products`;

    const textContent = `
Hi ${firstName},

Great news! Your seller account has been approved by our admin team.

You can now:
- Create and manage product listings
- Receive orders from customers
- Manage your store profile
- Track sales and earnings

To start selling, visit your seller dashboard and create your first product.

If you have any questions, please contact our support team.

Best regards,
Kopa Marketplace Team
    `.trim();

    const htmlContent = `
        <!DOCTYPE html>
        <html dir="ltr" lang="en">
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
            .section { margin: 20px 0; }
            .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin-top: 15px; }
            .checkmark { font-size: 48px; margin: 10px 0; }
            .footer { background: #333; color: white; padding: 20px; text-align: center; font-size: 12px; }
            .steps { background: white; padding: 15px; margin: 10px 0; border-left: 4px solid #667eea; }
            .step-title { font-weight: bold; color: #667eea; margin-bottom: 8px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="checkmark">✓</div>
              <h1 style="margin: 0;">Verification Approved!</h1>
              <p style="margin: 10px 0 0 0;">Welcome to ${this.appName}</p>
            </div>
            
            <div class="content">
              <p>Dear <strong>${firstName || 'Seller'}</strong>,</p>
              
              <p>Congratulations! 🎉 Your seller account has been successfully verified and approved. Your store <strong>"${storeName}"</strong> is now active on ${this.appName}.</p>
              
              <div class="section">
                <h3 style="color: #667eea; margin-top: 0;">You can now:</h3>
                <div class="steps">
                  <div class="step-title">✓ Create Product Listings</div>
                  <p style="margin: 5px 0;">Upload your products with descriptions, prices, and images</p>
                </div>
                <div class="steps">
                  <div class="step-title">✓ Manage Your Store</div>
                  <p style="margin: 5px 0;">Update store information and manage your inventory</p>
                </div>
                <div class="steps">
                  <div class="step-title">✓ Receive Orders</div>
                  <p style="margin: 5px 0;">Buyers can now find and purchase your products</p>
                </div>
              </div>
              
              <p style="text-align: center;">
                <a href="${productsUrl}" class="button">Start Adding Products</a>
              </p>
              
              <div class="section" style="background: #f0f4ff; padding: 15px; border-radius: 5px; border-left: 4px solid #667eea;">
                <h4 style="margin-top: 0; color: #667eea;">Quick Tips:</h4>
                <ul style="margin: 10px 0; padding-left: 20px;">
                  <li>Use high-quality product images</li>
                  <li>Write detailed product descriptions</li>
                  <li>Price your products competitively</li>
                  <li>Respond quickly to customer inquiries</li>
                  <li>Maintain excellent customer service</li>
                </ul>
              </div>
              
              <p>If you have any questions, please contact our support team at <strong>support@kopamarketplace.com</strong></p>
              
              <p>Best regards,<br>
              <strong>${this.appName} Team</strong></p>
            </div>
            
            <div class="footer">
              <p>This is an automated message. Please do not reply to this email.</p>
              <p>&copy; 2024 ${this.appName}. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `;

    await this.sendEmail(to, subject, textContent, htmlContent);
  }

  /**
   * Send seller rejection email
   *
   * Notifies seller that their verification was rejected.
   * Provides reason and instructions for resubmission.
   *
   * @param to
   * @param  firstName
   * @param stepToReject
   * @param  rejectionReason
   *
   */
  async sendRejectionEmail(
    to: string,
    firstName: string,
    rejectionReason: string,
    stepToReject?: number,
  ): Promise<void> {
    const subject = '📋 Your Seller Application Needs Review';
    const onboardingUrl = `${this.appUrl}/seller/onboarding`;
    // const dashboardUrl = `${this.appUrl}/seller/dashboard`;

    const stepInfo = stepToReject
      ? `\n\nPlease resubmit Step ${stepToReject} with corrected information.`
      : '\n\nPlease review all steps and resubmit any that need correction.';

    const textContent = `
Hi ${firstName},

Thank you for submitting your seller onboarding application.

Unfortunately, we need some adjustments before we can approve your account:

Reason: ${rejectionReason}
${stepInfo}

What to do next:
1. Log in to your account
2. Review the rejected step(s)
3. Fix the issue based on the feedback
4. Resubmit your application

Our team will review your resubmission within 24 hours.

If you have questions about what to fix, please contact support@kopa.com

Best regards,
Kopa Marketplace Team
    `.trim();

    const stepDescription = {
      1: 'Business Information',
      2: 'ID Verification',
      3: 'Liveness Check (Selfie)',
      4: 'Store Profile',
    };

    const stepInstruction = {
      1: 'Please review and update your business information, then resubmit.',
      2: 'Please upload clear and readable photos of both sides of your ID. Ensure all corners are visible and text is readable.',
      3: 'Please take a new selfie in good lighting. Make sure your face is clearly visible and matches your ID photos.',
      4: 'Please review your store profile and ensure all information is correct, then resubmit.',
    };

    const htmlContent = `
        <!DOCTYPE html>
        <html dir="ltr" lang="en">
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
            .warning-box { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 5px; }
            .instruction-box { background: #e8f4f8; border-left: 4px solid #17a2b8; padding: 15px; margin: 15px 0; border-radius: 5px; }
            .button { display: inline-block; padding: 12px 30px; background: #f5576c; color: white; text-decoration: none; border-radius: 5px; margin-top: 15px; }
            .footer { background: #333; color: white; padding: 20px; text-align: center; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0;">Verification Needs Attention</h1>
              <p style="margin: 10px 0 0 0;">Please review the details below</p>
            </div>
            
            <div class="content">
              <p>Dear <strong>${firstName || 'Seller'}</strong>,</p>
              
              <p>Thank you for submitting your seller verification. We've reviewed your application, and we need you to make some corrections before we can approve your account.</p>
              
              <div class="warning-box">
                <h3 style="margin: 0 0 10px 0; color: #856404;">⚠️ Issue Found:</h3>
                <p style="margin: 0; font-weight: bold; color: #856404;">${rejectionReason}</p>
              </div>
              
              ${
                stepToReject
                  ? `
                <div class="instruction-box">
                  <h4 style="margin: 0 0 10px 0; color: #0c5460;">Step ${stepToReject}: ${stepDescription[stepToReject]}</h4>
                  <p style="margin: 0; color: #0c5460;">${stepInstruction[stepToReject]}</p>
                </div>
              `
                  : ''
              }
              
              <h3 style="color: #f5576c;">What to do next:</h3>
              <ol>
                <li>Return to your seller dashboard</li>
                <li>Go to the onboarding section</li>
                <li>Complete the required step(s) with the necessary corrections</li>
                <li>Resubmit your application for review</li>
              </ol>
              
              <p style="text-align: center;">
                <a href="${onboardingUrl}" class="button">Complete Your Verification</a>
              </p>
              
              <div style="background: #f0f0f0; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <h4 style="margin: 0 0 10px 0;">Need Help?</h4>
                <p style="margin: 0;">If you have questions about this decision or need assistance, please contact our support team:</p>
                <p style="margin: 10px 0 0 0;">
                  📧 Email: <strong>support@kopamarketplace.com</strong><br>
                  💬 WhatsApp: <strong>+234 XXX XXXX XXX</strong>
                </p>
              </div>
              
              <p>We appreciate your patience and look forward to having you as part of our seller community!</p>
              
              <p>Best regards,<br>
              <strong>${this.appName} Verification Team</strong></p>
            </div>
            
            <div class="footer">
              <p>This is an automated message. Please do not reply to this email.</p>
              <p>&copy; 2024 ${this.appName}. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `;

    await this.sendEmail(to, subject, textContent, htmlContent);
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

  /*
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

  */

  private async sendEmail(
    to: string,
    subject: string,
    text: string,
    html?: string,
  ): Promise<void> {
    const { data, error } = await this.resend.emails.send({
      from: this.configService.getOrThrow<string>('RESEND_MAIL_FROM'),
      to,
      subject,
      text,
      html,
    });

    if (error) {
      this.logger.error('Email failed to send', error);
      throw new Error(error.message);
    }

    this.logger.log(`Email sent successfully to ${to}. ID: ${data?.id}`);
  }

  /**
   * Verify email configuration and connectivity
   *
   * @throws Error if transporter cannot connect
   */

  /*
  async verifyConnection(): Promise<void> {
    await this.transporter.verify();
    this.logger.log('Email service connected successfully');
  }

*/

  /*
  private async sendMailSafe(options: SendMailOptions): Promise<string> {
    // eslint-disable-next-line
    const result = await this.transporter.sendMail(options);

    const messageId = (result as { messageId?: string })?.messageId;

    if (!messageId) {
      throw new Error('Invalid mail response');
    }

    return messageId;
  }
*/
}
