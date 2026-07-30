import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class UpdateConversationDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;
}
