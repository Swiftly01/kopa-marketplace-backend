import { IsString, MaxLength, MinLength } from 'class-validator';
import { Trim } from '../utils/trim.decorator';

// the reason is shown to the owner so they know what to fix
export class RejectListingDto {
  @Trim()
  @IsString()
  @MinLength(5)
  @MaxLength(500)
  reason!: string;
}
