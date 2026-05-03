import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class AdminRejectOnboardingDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  rejectionReason!: string;
}
