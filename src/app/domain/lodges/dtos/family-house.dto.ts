import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  MaxLength,
} from 'class-validator';
import { PaginationQueryDto } from '../../../common/pagination/dtos/pagination-query.dto';
import { Trim } from '../../listings/utils/trim.decorator';
import { PhoneNumber } from '../utils/phone.decorator';

// reads the raw query value: implicit conversion would turn "false" into true
const toBool = ({
  obj,
  key,
}: {
  obj: Record<string, unknown>;
  key: string;
}) => {
  const raw = obj[key];
  return raw === 'true' ? true : raw === 'false' ? false : raw;
};

// details of the house itself, shared by create and update
export class FamilyHouseDetailsDto {
  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(100)
  fellowship?: string;

  @IsOptional()
  @Trim()
  @IsString()
  @Length(10, 500)
  address?: string;

  // stateCode and lgaName come together; the service resolves canonical names
  @IsOptional()
  @Trim()
  @IsString()
  @Length(2, 10)
  stateCode?: string;

  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(100)
  lgaName?: string;

  @IsOptional()
  @PhoneNumber()
  contactPhone?: string;

  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(500)
  description?: string;
}

export class CreateFamilyHouseDto extends FamilyHouseDetailsDto {
  @Trim()
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  name!: string;

  // an existing user who becomes the house admin
  @IsUUID()
  adminUserId!: string;
}

export class UpdateFamilyHouseDto extends FamilyHouseDetailsDto {
  @IsOptional()
  @Trim()
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  name?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class AssignHouseAdminDto {
  @IsUUID()
  userId!: string;
}

export class FamilyHouseQueryDto extends PaginationQueryDto {
  @IsOptional()
  @Transform(toBool)
  @IsBoolean()
  isActive?: boolean;

  // true: houses with an admin, false: houses waiting for one
  @IsOptional()
  @Transform(toBool)
  @IsBoolean()
  hasAdmin?: boolean;

  @IsOptional()
  @Trim()
  @IsString()
  @Length(2, 10)
  stateCode?: string;
}
