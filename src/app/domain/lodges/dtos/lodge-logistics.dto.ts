import {
  IsEnum,
  IsIn,
  IsOptional,
  IsString,
  Length,
  MaxLength,
} from 'class-validator';
import { Trim } from '../../listings/utils/trim.decorator';
import { BatchStatus, TransitStatus } from '../enums/lodge.enums';
import { PhoneNumber } from '../utils/phone.decorator';

export class CreateGateDto {
  @Trim()
  @IsString()
  @Length(2, 100)
  name!: string;

  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(200)
  description?: string;

  @IsOptional()
  @Trim()
  @IsString()
  @Length(2, 100)
  marshalName?: string;

  @IsOptional()
  @PhoneNumber()
  marshalPhone?: string;
}

export class UpdateGateDto {
  @IsOptional()
  @Trim()
  @IsString()
  @Length(2, 100)
  name?: string;

  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(200)
  description?: string | null;

  @IsOptional()
  @Trim()
  @IsString()
  @Length(2, 100)
  marshalName?: string | null;

  @IsOptional()
  @PhoneNumber()
  marshalPhone?: string | null;
}

// moves a shuttle trip along: scheduled -> boarding -> in_transit -> completed (or cancelled)
export class BatchStatusDto {
  @IsEnum(BatchStatus)
  status!: BatchStatus;
}

// "Board Bus" / "Mark Arrived" / waiting at the gate
export class TransitActionDto {
  @IsIn([TransitStatus.AT_GATE, TransitStatus.BOARDED, TransitStatus.ARRIVED])
  status!: TransitStatus;
}

export class AlertMessageDto {
  @Trim()
  @IsString()
  @Length(3, 300)
  message!: string;
}

