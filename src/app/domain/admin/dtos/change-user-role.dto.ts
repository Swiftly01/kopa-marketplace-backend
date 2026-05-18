import { IsEnum } from 'class-validator';
import { UserRole } from '../../../common/enums/roles-enum';

export class ChangeUserRoleDto {
  @IsEnum(UserRole)
  newRole!: UserRole;
}
