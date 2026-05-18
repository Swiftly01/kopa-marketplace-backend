import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Not, Repository } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { AppLogger } from '../../../logger/logger.service';
import { FilterUsersDto } from '../dtos/filter-users-dto';
import { QueryFilterProvider } from '../../../common/providers/query-filter-provider';
import { PaginationProvider } from '../../../common/pagination/providers/pagination.provider';
import { UserStatus } from '../../../common/enums/user-status.enum';
import { UserRole } from '../../../common/enums/roles-enum';

@Injectable()
export class AdminUserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly queryFilterProvider: QueryFilterProvider,
    private readonly paginateProvider: PaginationProvider,
    private readonly logger: AppLogger,
  ) {}

  async getAllUsers(query: FilterUsersDto, baseUrl?: string) {
    this.logger.log('Fetching all users');

    let qb = this.userRepository
      .createQueryBuilder('user')
      .select([
        'user.id',
        'user.email',
        'user.firstName',
        'user.role',
        'user.status',
        'user.createdAt',
      ]);

    qb = this.queryFilterProvider.applyFilters(qb, query, {
      alias: 'user',

      searchableFields: ['email', 'firstName', 'lastName'],

      allowedSortFields: ['email', 'role', 'status', 'createdAt'],

      allowedBooleanFields: ['isActive'],

      sortMap: {
        newest: { field: 'createdAt', order: 'DESC' },
      },

      allowedEnumFields: {
        status: Object.values(UserStatus),
        role: Object.values(UserRole),
      },

      dateField: 'createdAt',
    });

    return this.paginateProvider.paginateQuery(qb, query, baseUrl);
  }

  async getUser(userId: string) {
    this.logger.log(`Fetching user: ${userId}`);

    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async changeUserRole(userId: string, newRole: UserRole, adminId: string) {
    this.logger.log(
      `Admin ${adminId} changing role for user ${userId} to ${newRole}`,
    );

    const allowedRoles = [UserRole.ADMIN, UserRole.BUYER, UserRole.SELLER];

    //Validate role
    if (!allowedRoles.includes(newRole)) {
      throw new BadRequestException(
        `Invalid role. Must be ${allowedRoles.join(', ')}`,
      );
    }

    if (userId === adminId) {
      throw new BadRequestException('You cannot change your own role');
    }

    const user = await this.userRepository.findOne({
      where: {
        id: userId,
        status: UserStatus.Active,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const oldRole = user.role;

    user.role = newRole;
    await this.userRepository.save(user);

    this.logger.log(
      `User ${userId} role changed: ${oldRole} → ${newRole} by admin ${adminId}`,
    );

    return this.formatUserResponse(user);
  }

  async suspendUser(userId: string, adminId: string, reason?: string) {
    this.logger.log(
      `Admin ${adminId} suspending user ${userId}. Reason: ${reason || 'None'}`,
    );

    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.isSuspended) {
      throw new BadRequestException('User is already suspended');
    }

    user.status = UserStatus.SUSPENDED;
    user.isSuspended = true;
    user.suspensionReason = reason || null;

    await this.userRepository.save(user);

    this.logger.warn(`User ${userId} suspended by admin ${adminId}`);

    return this.formatUserResponse(user);
  }

  async unsuspendUser(userId: string, adminId?: string) {
    this.logger.log(`Admin ${adminId} unsususpending user ${userId}`);

    const user = await this.userRepository.findOne({
      where: {
        id: userId,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!user.isSuspended) {
      throw new BadRequestException('User is not suspended');
    }

    user.isSuspended = false;
    user.status = UserStatus.Active;
    user.suspensionReason = null;

    await this.userRepository.save(user);

    return this.formatUserResponse(user);
  }

  async deleteUser(userId: string, reason?: string, adminId?: string) {
    this.logger.log(
      `Admin ${adminId} deleting user ${userId}. Reason: ${reason || 'None'}`,
    );

    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.deletedAt) {
      throw new BadRequestException('User is already deleted');
    }

    // Soft delete
    user.deletedAt = new Date();

    // Suspend before deletion for safety
    user.isSuspended = true;

    await this.userRepository.save(user);

    this.logger.warn(
      `User ${userId} deleted by admin ${adminId}. Reason: ${reason || 'None'}`,
    );

    return {
      id: user.id,
      email: user.email,
      deleted: true,
      deletedAt: user.deletedAt,
    };
  }

  async getUsersByRole(role: UserRole) {
    this.logger.log(`Fetching all ${role} users`);

    const users = await this.userRepository.find({
      where: {
        role,
      },
      order: { createdAt: 'DESC' },
    });

    return users.map((u: User) => this.formatUserResponse(u));
  }

  async getUserStatistics() {
    this.logger.log(`Calculating user statistics`);

    const [
      total,
      userCount,
      sellerCount,
      adminCount,
      suspendedCount,
      deletedCount,
    ] = await Promise.all([
      this.userRepository.count({
        where: {
          deletedAt: IsNull(),
        },
      }),
      this.userRepository.count({
        where: {
          role: UserRole.BUYER,
          deletedAt: IsNull(),
        },
      }),
      this.userRepository.count({
        where: {
          role: UserRole.SELLER,
          deletedAt: IsNull(),
        },
      }),
      this.userRepository.count({
        where: {
          role: UserRole.ADMIN,
          deletedAt: IsNull(),
        },
      }),
      this.userRepository.count({
        where: { isSuspended: true, deletedAt: IsNull() },
      }),
      this.userRepository.count({
        where: { deletedAt: Not(IsNull()) },
        withDeleted: true,
      }),
    ]);

    return {
      total,
      byRole: {
        user: userCount,
        seller: sellerCount,
        admin: adminCount,
      },
      byStatus: {
        active: total - suspendedCount,
        suspended: suspendedCount,
        deleted: deletedCount,
      },
    };
  }

  private formatUserResponse(user: User) {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phoneNumber: user.phoneNumber,
      role: user.role,
      status: user.status,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
