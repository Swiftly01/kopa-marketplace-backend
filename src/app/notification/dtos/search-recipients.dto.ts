import { IsEnum } from 'class-validator';
import { FilterUsersDto } from '../../domain/admin/dtos/filter-users-dto';
import { BatchFeature } from '../enums/batch-feature.enum';

export class SearchRecipientsDto extends FilterUsersDto {
  @IsEnum(BatchFeature)
  feature!: BatchFeature;
}
