import { IsEnum, IsOptional } from 'class-validator';
import { PaginationQueryDto } from '../../../common/pagination/dtos/pagination-query.dto';
import { CallType } from '../enums/call-type.enum';
import { SortOrder } from '../../admin/dtos/filter-users-dto';

export class CallHistoryQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(CallType)
  type?: CallType;

  @IsOptional()
  @IsEnum(SortOrder)
  sortOrder?: SortOrder;
}
