import {
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { Trim } from '../../utils/trim.decorator';
import {
  ADDRESS_MAX_LENGTH,
  ESTATE_NAME_MAX_LENGTH,
  MAX_BATHROOMS,
  MAX_BEDROOMS,
  MAX_TOILETS,
  PROPERTY_SIZE_MAX_LENGTH,
} from './property-rent.constants';
import {
  Facility,
  Furnishing,
  ListedBy,
  MinimumRentalPeriod,
  PricePeriod,
  PropertyCondition,
  PropertyType,
} from './property-rent.enums';

// the `details` payload of a "Houses & Apartments for Rent" listing
export class PropertyRentDetailsDto {
  @Trim()
  @IsString()
  @IsNotEmpty()
  @MaxLength(ADDRESS_MAX_LENGTH)
  address!: string;

  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(ESTATE_NAME_MAX_LENGTH)
  estateName?: string;

  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(PROPERTY_SIZE_MAX_LENGTH)
  propertySize?: string;

  @IsEnum(PropertyType)
  propertyType!: PropertyType;

  @IsEnum(PropertyCondition)
  condition!: PropertyCondition;

  @IsEnum(Furnishing)
  furnishing!: Furnishing;

  @IsInt()
  @Min(1)
  @Max(MAX_BEDROOMS)
  bedrooms!: number;

  @IsInt()
  @Min(1)
  @Max(MAX_BATHROOMS)
  bathrooms!: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(MAX_TOILETS)
  toilets?: number;

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsEnum(Facility, { each: true })
  facilities?: Facility[];

  @IsOptional()
  @IsEnum(ListedBy)
  listedBy?: ListedBy;

  @IsOptional()
  @IsBoolean()
  serviceCharge?: boolean;

  @IsEnum(MinimumRentalPeriod)
  minimumRentalPeriod!: MinimumRentalPeriod;

  @IsOptional()
  @IsEnum(PricePeriod)
  pricePeriod?: PricePeriod;
}
