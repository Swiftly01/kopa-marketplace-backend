import { IsEnum, IsOptional } from 'class-validator';
import { CallType } from '../enums/call-type.enum';

export class GetCallHistoryDto {
  @IsOptional()
  @IsEnum(CallType)
  type?: CallType;

  @IsOptional()
  page?: number;

  @IsOptional()
  limit?: number;
}
