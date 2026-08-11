import { IsEnum, IsOptional } from 'class-validator';

export class DeleteFileDto {
  @IsOptional()
  @IsEnum(['image', 'raw'])
  resourceType?: 'image' | 'raw';
}
