import { IsString, IsNotEmpty, IsOptional, IsIn } from 'class-validator';

export class RejectSellerDto {
  @IsString()
  @IsNotEmpty()
  rejectionReason!: string;

  @IsOptional()
  @IsIn([1, 2, 3, 4])
  stepToReject?: 1 | 2 | 3 | 4; // ✅ strong typing
}
