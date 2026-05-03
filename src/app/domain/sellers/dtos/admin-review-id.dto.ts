import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { StatusEnum } from '../../../common/enums/status.enum';

export class AdminReviewIdDto {
  @IsEnum(StatusEnum)
  @IsNotEmpty()
  status!: StatusEnum;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  rejectionReason?: string;
}
