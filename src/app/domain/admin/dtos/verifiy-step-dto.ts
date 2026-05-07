import { IsBoolean, IsNotEmpty } from 'class-validator';

export class VerifyStepDto {
  @IsNotEmpty()
  @IsBoolean()
  verified!: boolean;
}
