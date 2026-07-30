import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { CallType } from '../enums/call-type.enum';

export class InitiateCallDto {
  // The user being called
  @IsUUID()
  calleeId: string;

  @IsEnum(CallType)
  type: CallType;

  // Link this call to an existing conversation
  @IsOptional()
  @IsUUID()
  conversationId?: string;
}
