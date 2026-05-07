import {
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Max,
  Min,
} from 'class-validator';

export class ImageUploadDto {
  @IsString()
  base64!: string;

  @IsString()
  @Length(1, 255)
  filename!: string;

  @IsNumber()
  @Min(1)
  @Max(5242880) // 5MB max
  fileSize!: number;

  @IsString()
  @IsIn(['image/jpeg', 'image/png', 'image/webp'])
  @IsOptional()
  mimeType?: string;
}
