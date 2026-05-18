import { Type } from 'class-transformer';
import { IsDate, IsEnum, IsOptional, IsString } from 'class-validator';
import { UserRole } from '../../../common/enums/roles-enum';
import { UserStatus } from '../../../common/enums/user-status.enum';
import { BaseFilterDto } from '../../../common/providers/query-filter-provider';

export enum SortOrder {
  ASC = 'ASC',
  DESC = 'DESC',
}

export class FilterUsersDto implements BaseFilterDto {
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  startDate?: Date;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  endDate?: Date;

  @IsOptional()
  @IsString()
  sortBy?: string;

  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;

  @IsOptional()
  @IsEnum(SortOrder)
  sortOrder?: SortOrder;
}
