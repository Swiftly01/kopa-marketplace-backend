import { IsEnum, IsUUID, ValidateIf } from 'class-validator';
import { UserRole } from '../../../common/enums/roles-enum';

export class ChangeUserRoleDto {
  @IsEnum(UserRole)
  newRole!: UserRole;

  // the house to run; required only when newRole is family_house_admin
  @ValidateIf((dto: ChangeUserRoleDto) => dto.newRole === UserRole.FAMILY_HOUSE_ADMIN)
  @IsUUID()
  familyHouseId?: string;
}
