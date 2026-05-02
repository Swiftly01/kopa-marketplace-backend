import { IsNotEmpty, IsString } from 'class-validator';

export class RefreshTokenOtpDto {
  @IsString()
  @IsNotEmpty()
  refreshToken!: string;
}
