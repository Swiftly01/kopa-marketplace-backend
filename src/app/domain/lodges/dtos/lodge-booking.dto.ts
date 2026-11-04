import { Transform } from 'class-transformer';
import {
  Equals,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Matches,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { Trim } from '../../listings/utils/trim.decorator';
import { CorperGender } from '../enums/lodge.enums';
import { PhoneNumber } from '../utils/phone.decorator';

// multipart text fields arrive as strings, and implicit conversion would turn "false" into true
const toBool = ({ obj, key }: { obj: Record<string, unknown>; key: string }) => {
  const raw = obj[key];
  return raw === 'true' || raw === true
    ? true
    : raw === 'false' || raw === false
      ? false
      : raw;
};

// personal, bed and pickup details shared by the corper form and the exco's manual entry
export class BookingDetailsDto {
  @Trim()
  @IsString()
  @Length(3, 120)
  fullName!: string;

  // NYSC call-up / state code, e.g. OS/26A/0123 or NYSC/OS/2026/XXXXXX
  @Trim()
  @IsString()
  @Matches(/^[A-Za-z0-9/\-]{6,40}$/, {
    message: 'callUpNumber must be a valid NYSC call-up / state code',
  })
  callUpNumber!: string;

  @PhoneNumber()
  whatsappPhone!: string;

  @IsEnum(CorperGender)
  gender!: CorperGender;

  // required when the lodge assigns beds up front; optional for hybrid lodges
  @IsOptional()
  @IsUUID()
  bedSlotId?: string;

  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(60)
  lightsOutRoutine?: string;

  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(60)
  morningRoutine?: string;

  @IsOptional()
  @IsUUID()
  pickupBatchId?: string;

  // one of the lodge's assembly gates
  @IsOptional()
  @IsUUID()
  pickupGateId?: string;

  // "2 Boxes + 1 Bucket"
  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(100)
  luggageNote?: string;

  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(100)
  welfareNeed?: string;

  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(100)
  nextOfKinName?: string;

  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(40)
  nextOfKinRelation?: string;

  @IsOptional()
  @PhoneNumber()
  nextOfKinPhone?: string;
}

// the corper form posts as multipart: these fields plus up to 3 `documents` files
export class CreateBookingDto extends BookingDetailsDto {
  // signed value from POST /lodges/:id/bookings/passcode
  @Trim()
  @IsString()
  @IsNotEmpty()
  @MaxLength(512)
  passcodeToken!: string;

  @Transform(toBool)
  @Equals(true, { message: 'You must agree to the lodge rules' })
  agreedToRules!: boolean;
}

// walk-in entered by the exco; confirmed straight away, no corper account needed
export class ManualBookingDto extends BookingDetailsDto {
  @IsUUID()
  lodgeId!: string;
}

export class AssignBedDto {
  @IsUUID()
  bedSlotId!: string;
}

export class RejectBookingDto {
  @Trim()
  @IsString()
  @Length(5, 300)
  reason!: string;
}

// partial edit of a submitted booking; null clears an optional field
export class UpdateMyBookingDto {
  @ValidateIf((_, value) => value !== undefined)
  @Trim()
  @IsString()
  @Length(3, 120)
  fullName?: string;

  @ValidateIf((_, value) => value !== undefined)
  @Trim()
  @IsString()
  @Matches(/^[A-Za-z0-9/\-]{6,40}$/, {
    message: 'callUpNumber must be a valid NYSC call-up / state code',
  })
  callUpNumber?: string;

  @ValidateIf((_, value) => value !== undefined)
  @PhoneNumber()
  whatsappPhone?: string;

  @ValidateIf((_, value) => value !== undefined)
  @IsEnum(CorperGender)
  gender?: CorperGender;

  // moves the corper to another free bed in the right wing
  @IsOptional()
  @IsUUID()
  bedSlotId?: string;

  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(60)
  lightsOutRoutine?: string | null;

  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(60)
  morningRoutine?: string | null;

  // null drops the pickup request
  @IsOptional()
  @IsUUID()
  pickupBatchId?: string | null;

  @IsOptional()
  @IsUUID()
  pickupGateId?: string | null;

  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(100)
  luggageNote?: string | null;

  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(100)
  welfareNeed?: string | null;

  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(100)
  nextOfKinName?: string | null;

  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(40)
  nextOfKinRelation?: string | null;

  @IsOptional()
  @PhoneNumber()
  nextOfKinPhone?: string | null;
}
