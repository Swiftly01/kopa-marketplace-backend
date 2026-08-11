import { IsEnum, IsOptional } from 'class-validator';
import { CloudinaryFolders } from '../../cloudinary/enums/cloudinary-folders.enum';

export class UploadFileDto {
  @IsOptional()
  @IsEnum(CloudinaryFolders)
  folder?: CloudinaryFolders;

  @IsOptional()
  @IsEnum(['image', 'raw', 'auto'])
  resourceType?: 'image' | 'raw' | 'auto';
}
