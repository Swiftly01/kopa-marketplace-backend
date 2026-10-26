import {
  IsEnum,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import {
  DESCRIPTION_MAX_LENGTH,
  DESCRIPTION_MIN_LENGTH,
  MAX_PRICE,
  TITLE_MAX_LENGTH,
  TITLE_MIN_LENGTH,
  VIDEO_URL_MAX_LENGTH,
  VIDEO_URL_PATTERN,
} from '../constants/listing.constants';
import { NegotiationStatus } from '../enums/negotiation-status.enum';
import { Trim } from '../utils/trim.decorator';

// fields every category shares; `details` is validated by the category handler
export class CreateListingDto {
  @IsUUID()
  categoryId!: string;

  @Trim()
  @IsString()
  @Length(TITLE_MIN_LENGTH, TITLE_MAX_LENGTH)
  title!: string;

  @Trim()
  @IsString()
  @Length(DESCRIPTION_MIN_LENGTH, DESCRIPTION_MAX_LENGTH)
  description!: string;

  // whole Naira
  @IsInt()
  @Min(1)
  @Max(MAX_PRICE)
  price!: number;

  @IsOptional()
  @IsEnum(NegotiationStatus)
  negotiable?: NegotiationStatus;

  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(VIDEO_URL_MAX_LENGTH)
  @Matches(VIDEO_URL_PATTERN, {
    message: 'videoUrl must be a YouTube or Facebook link',
  })
  videoUrl?: string;

  @Trim()
  @IsString()
  @Matches(/^[A-Za-z]{2,10}$/, { message: 'stateCode must be letters only' })
  stateCode!: string;

  @Trim()
  @IsString()
  @Length(2, 100)
  lgaName!: string;

  @IsObject()
  details!: Record<string, unknown>;
}
