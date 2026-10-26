import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { PaginationQueryDto } from '../../../common/pagination/dtos/pagination-query.dto';
import { ListingStatus } from '../enums/listing-status.enum';

// admin review queue; no status = every ad that is not a draft
export class AdminListingQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(ListingStatus)
  status?: ListingStatus;

  @IsOptional()
  @IsUUID()
  categoryId?: string;
}
