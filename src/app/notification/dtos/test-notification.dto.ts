import {
  IsEmail,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class TestNotificationDto {
  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\+[1-9]\d{7,14}$/, {
    message: 'phoneNumber must be in E.164 format, e.g. +2348012345678',
  })
  phoneNumber?: string;

  @IsOptional()
  @IsString()
  @MinLength(10)
  pushToken?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  message?: string;
}
