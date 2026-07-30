import { IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class SdpDto {
  @IsUUID()
  callId: string;

  @IsString()
  @IsNotEmpty()
  sdpType: 'offer' | 'answer';

  @IsString()
  @IsNotEmpty()
  sdp: string;
}
