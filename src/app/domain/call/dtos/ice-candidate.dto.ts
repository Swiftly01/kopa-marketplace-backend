import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class IceCandidateDto {
  @IsUUID()
  callId: string;

  @IsString()
  @IsNotEmpty()
  candidate: string;

  @IsOptional()
  @IsString()
  sdpMid?: string;

  @IsOptional()
  sdpMLineIndex?: number;
}
