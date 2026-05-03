import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { StatusEnum } from '../../../common/enums/status.enum';

export class AdminReviewStoreProfileDto {
  @IsEnum(StatusEnum)
  @IsNotEmpty()
  status!: StatusEnum;

  /**
   * If rejected, explain why
   */
  @IsOptional()
  @IsString()
  @MaxLength(500)
  rejectionReason?: string;
}
