import { IsOptional, IsString, Length } from 'class-validator';

export class SuspendUserDto {
  @IsOptional()
  @IsString()
  @Length(5, 500)
  reason?: string;
}
