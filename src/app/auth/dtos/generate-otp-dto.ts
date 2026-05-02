import { IsEmail, IsNotEmpty, IsOptional, Matches } from 'class-validator';

export class GenerateOtpDto {
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @IsOptional()
  @Matches(/^(EMAIL|SMS)$/)
  deliveryMethod?: string;
}
