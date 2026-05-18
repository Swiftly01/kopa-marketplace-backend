import { IsOptional, IsString, Length } from 'class-validator';

export class DeleteUserDto {
  @IsOptional()
  @IsString()
  @Length(5, 500)
  reason?: string;
}
