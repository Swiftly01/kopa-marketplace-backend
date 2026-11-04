import {
  IsEnum,
  IsOptional,
  IsString,
  Length,
  MaxLength,
} from 'class-validator';
import { PaginationQueryDto } from '../../../common/pagination/dtos/pagination-query.dto';
import { Trim } from '../../listings/utils/trim.decorator';
import { FamilyHouseApplicationStatus } from '../enums/lodge.enums';
import { PhoneNumber } from '../utils/phone.decorator';

// what a user sends when asking to register a family house
export class CreateFamilyHouseApplicationDto {
  @Trim()
  @IsString()
  @Length(5, 150)
  houseName!: string;

  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(100)
  fellowship?: string;

  @Trim()
  @IsString()
  @Length(10, 500)
  address!: string;

  @Trim()
  @IsString()
  @Length(2, 10)
  stateCode!: string;

  @Trim()
  @IsString()
  @MaxLength(100)
  lgaName!: string;

  @PhoneNumber()
  contactPhone!: string;

  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(500)
  description?: string;
}

// `search` matches house name, applicant name and email
export class ApplicationQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(FamilyHouseApplicationStatus)
  status?: FamilyHouseApplicationStatus;
}

export class RejectApplicationDto {
  @Trim()
  @IsString()
  @Length(5, 300)
  reason!: string;
}
