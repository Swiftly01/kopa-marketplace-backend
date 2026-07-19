import { IsEnum, IsString, MinLength } from 'class-validator';
import { DevicePlatform } from '../enums/device-platform.enum';

export class RegisterDeviceTokenDto {
  @IsString()
  @MinLength(10)
  token!: string;

  @IsEnum(DevicePlatform)
  platform!: DevicePlatform;
}
