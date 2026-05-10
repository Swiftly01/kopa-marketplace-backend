import { IsBoolean, IsEnum, IsOptional, IsString } from 'class-validator';
import { LocationType } from '../entities/location.entity';

export class LocationQueryDto {
  @IsOptional()
  @IsEnum(LocationType)
  type?: LocationType;

  @IsOptional()
  @IsString()
  parentId?: string;

  @IsOptional()
  @IsString()
  region?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  // sorting
  @IsOptional()
  @IsString()
  sortBy?: string;

  @IsOptional()
  @IsString()
  sortOrder?: 'asc' | 'desc';
}
