import {
  IsEnum,
  IsNotEmpty,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { IdTypeEnum } from '../../../common/enums/id-type.enum';

export class SubmitIdVerificationDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(100)
  fullName!: string;

  @IsString()
  @IsNotEmpty()
  stateCodeNumber!: string;

  @IsString()
  @IsNotEmpty()
  stateCode!: string;

  @IsString()
  @IsNotEmpty()
  stateName!: string;

  @IsString()
  @IsNotEmpty()
  ppaLga!: string;

  @IsEnum(IdTypeEnum)
  @IsNotEmpty()
  idType!: IdTypeEnum;

  @IsNotEmpty()
  @IsString()
  idNumber!: string;
}
