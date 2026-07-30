import { IsEnum, IsOptional } from 'class-validator';
import { PaginationQueryDto } from '../../../common/pagination/dtos/pagination-query.dto';
import { SortOrder } from '../../admin/dtos/filter-users-dto';

export class ConversationQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(SortOrder)
  sortOrder?: SortOrder;
}
