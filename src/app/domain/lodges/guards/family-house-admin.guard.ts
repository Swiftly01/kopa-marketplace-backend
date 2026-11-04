import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserRole } from '../../../common/enums/roles-enum';
import {
  JwtUser,
  RequestWithUser,
} from '../../../common/types/request-with-user.interface';
import { User } from '../../users/entities/user.entity';
import { RequestWithFamilyHouse } from '../decorators/current-family-house.decorator';
import { FamilyHouse } from '../entities/family-house.entity';

// role and house are read from the database on every request (not the JWT),
// so demoting an admin or deactivating a house takes effect immediately
@Injectable()
export class FamilyHouseAdminGuard implements CanActivate {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(FamilyHouse)
    private readonly houses: Repository<FamilyHouse>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<RequestWithUser<JwtUser> & RequestWithFamilyHouse>();
    const jwtUser = request.user;
    if (!jwtUser) {
      throw new UnauthorizedException('User not authenticated');
    }

    const user = await this.users.findOne({
      where: { id: jwtUser.id },
      select: { id: true, role: true, isSuspended: true },
    });
    if (!user || user.isSuspended) {
      throw new UnauthorizedException('User not found');
    }
    if (user.role !== UserRole.FAMILY_HOUSE_ADMIN) {
      throw new ForbiddenException('Family house admin access required');
    }

    const house = await this.houses.findOne({
      where: { adminUserId: user.id },
    });
    if (!house || !house.isActive) {
      throw new ForbiddenException('No active family house is assigned to you');
    }

    request.familyHouse = house;
    return true;
  }
}
