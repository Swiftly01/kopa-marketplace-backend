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
  @IsEnum(['Camp Meetup', 'Local Delivery'], { each: true })
  deliveryPreferences!: string[];
}
