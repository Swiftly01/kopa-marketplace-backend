import { IsEnum, IsUUID } from 'class-validator';
import { InteractionType } from '../enums/interaction-type.enum';

export class CreateInteractionDto {
  // the id of a product OR of an ad (ids are UUIDs, so the id alone says which)
  @IsUUID()
  productId!: string;

  @IsUUID()
  sellerId!: string;

  @IsEnum(InteractionType)
  type!: InteractionType;
}
