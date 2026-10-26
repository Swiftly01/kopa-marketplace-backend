import {
  IsEnum,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
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

// every field is optional; the category cannot change after creation
export class UpdateListingDto {
  @IsOptional()
  @Trim()
  @IsString()
  @Length(TITLE_MIN_LENGTH, TITLE_MAX_LENGTH)
  title?: string;

  @IsOptional()
  @Trim()
  @IsString()
  @Length(DESCRIPTION_MIN_LENGTH, DESCRIPTION_MAX_LENGTH)
  description?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(MAX_PRICE)
  price?: number;

  @IsOptional()
  @IsEnum(NegotiationStatus)
  negotiable?: NegotiationStatus;

  // null clears the video link (IsOptional lets null through)
  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(VIDEO_URL_MAX_LENGTH)
  @Matches(VIDEO_URL_PATTERN, {
    message: 'videoUrl must be a YouTube or Facebook link',
  })
  videoUrl?: string | null;

  // stateCode and lgaName change together or not at all
  @IsOptional()
  @Trim()
  @IsString()
  @Matches(/^[A-Za-z]{2,10}$/, { message: 'stateCode must be letters only' })
  stateCode?: string;

  @IsOptional()
  @Trim()
  @IsString()
  @Length(2, 100)
  lgaName?: string;

  // when present it replaces the stored details, so send the complete object
  @IsOptional()
  @IsObject()
  details?: Record<string, unknown>;
}
