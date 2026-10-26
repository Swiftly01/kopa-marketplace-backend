import { ArrayNotEmpty, ArrayUnique, IsArray, IsUUID } from 'class-validator';

// image ids in the desired order; the first becomes the title picture
export class ReorderImagesDto {
  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique()
  @IsUUID('all', { each: true })
  imageIds!: string[];
}
