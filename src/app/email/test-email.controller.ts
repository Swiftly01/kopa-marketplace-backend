import { Controller, Get, Query } from '@nestjs/common';
import { EmailService } from './email.service';
import { IsPublic } from '../auth/decorators/public.decorator';

@Controller('test-email')
export class TestEmailController {
  constructor(private readonly emailService: EmailService) {}

  @IsPublic()
  @Get()
  async send(@Query('email') email: string) {
    await this.emailService.sendOtpEmail(email, '123456', 'LOGIN');

    return {
      success: true,
      message: `Email sent to ${email}`,
    };
  }
}
