import { IsString, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class SearchLocationDto {
  @IsString()
  q!: string;

  @IsOptional()
  @Type(() => Number)
  limit?: number;
}
