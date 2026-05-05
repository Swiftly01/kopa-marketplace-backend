import { IsOptional, IsString } from 'class-validator';

export class ApproveSellerDto {
  @IsOptional()
  @IsString()
  adminNotes?: string;
}
