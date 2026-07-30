import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { ConversationType } from '../enums/conversation-type';

export class CreateConversationDto {
  // Direct chats: 2 IDs (creator + recipent)
  // Group chats: 2 - 50 participants
  @IsArray()
  @IsUUID('4', { each: true })
  @ArrayMinSize(2)
  @ArrayMaxSize(50)
  participantIds: string[];

  @IsOptional()
  @IsEnum(ConversationType)
  type?: ConversationType;

  // Required only for group chats
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;
}
