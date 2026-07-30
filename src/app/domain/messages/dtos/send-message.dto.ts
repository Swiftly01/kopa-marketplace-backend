import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  ValidateIf,
} from 'class-validator';
import { MessageType } from '../enums/message-type';

export class SendMessageDto {
  @IsUUID()
  conversationId: string;

  @ValidateIf((o: SendMessageDto) => !o.mediaUrl)
  @IsString()
  @IsNotEmpty()
  content?: string;

  @IsOptional()
  @IsEnum(MessageType)
  type?: MessageType;

  @ValidateIf((o: SendMessageDto) => !o.content)
  @IsString()
  @IsNotEmpty()
  mediaUrl?: string;

  @IsOptional()
  @IsString()
  fileName?: string;

  /** ID of message being replied to */
  @IsOptional()
  @IsUUID()
  replyToId?: string;
}
