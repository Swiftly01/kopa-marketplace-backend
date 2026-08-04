import { IsEnum, IsUUID } from 'class-validator';
import { InteractionType } from '../enums/interaction-type.enum';

export class CreateInteractionDto {
  @IsUUID()
  productId!: string;

  @IsUUID()
  sellerId!: string;

  @IsEnum(InteractionType)
  type!: InteractionType;
}
