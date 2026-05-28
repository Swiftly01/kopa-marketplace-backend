import { Type } from 'class-transformer';
import { IsDate, IsEnum, IsOptional, IsString } from 'class-validator';
import { UserRole } from '../../../common/enums/roles-enum';
import { UserStatus } from '../../../common/enums/user-status.enum';
import { BaseFilterDto } from '../../../common/providers/query-filter-provider';
import { PaginationQueryDto } from '../../../common/pagination/dtos/pagination-query.dto';
import { SellerVerificationStatusEnum } from '../../../common/enums/seller-verification-status.enum';

export enum SortOrder {
  ASC = 'ASC',
  DESC = 'DESC',
}

export class FilterUsersDto
  extends PaginationQueryDto
  implements BaseFilterDto
{
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  startDate?: Date;

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
  @IsEnum(SellerVerificationStatusEnum)
  verificationStatus?: SellerVerificationStatusEnum;

  @IsOptional()
  @IsEnum(SortOrder)
  sortOrder?: SortOrder;
}
