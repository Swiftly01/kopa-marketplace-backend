import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export enum DeliveryPreference {
  CAMP_MEETUP = 'camp_meetup',
  LOCAL_DELIVERY = 'local_delivery',
}
export class SubmitStoreProfileDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(100)
  storeName!: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^\+?234\d{10}$|^0\d{10}$/, {
    message: 'Invalid Nigerian WhatsApp number format',
  })
  whatsappNumber!: string;

  @IsArray()
  @ArrayMinSize(1)
  @IsEnum(DeliveryPreference, { each: true })
  deliveryPreferences!: DeliveryPreference[];
}
