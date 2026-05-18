import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export enum Purpose {
  VERIFY_EMAIL = 'verify_email',
  RESET_PASSWORD = 'reset_password',
}

export class ResendLinkDto {
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @IsString()
  purpose!: Purpose;
}
