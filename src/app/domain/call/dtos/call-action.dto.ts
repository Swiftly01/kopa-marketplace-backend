import { IsUUID } from 'class-validator';

export class CallActionDto {
  @IsUUID()
  callId: string;
}
