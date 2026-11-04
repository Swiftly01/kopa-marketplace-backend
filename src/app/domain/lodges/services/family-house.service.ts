import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, In, Repository } from 'typeorm';
import { UserRole } from '../../../common/enums/roles-enum';
import { Paginated } from '../../../common/pagination/interfaces/paginated.interface';
import { PaginationProvider } from '../../../common/pagination/providers/pagination.provider';
import { AppLogger } from '../../../logger/logger.service';
import { NotificationType } from '../../../notification/enums/notification-type.enum';
import { NotificationService } from '../../../notification/services/notification.service';
import { LocationService } from '../../location/location.service';
import { pickDefined } from '../../listings/utils/pick-defined';
import { User } from '../../users/entities/user.entity';
import {
  CreateFamilyHouseDto,
  FamilyHouseQueryDto,
  UpdateFamilyHouseDto,
} from '../dtos/family-house.dto';
import {
  FamilyHouseStatsView,
  FamilyHouseView,
} from '../dtos/lodge-response.dto';
import { FamilyHouseApplication } from '../entities/family-house-application.entity';
import { FamilyHouse } from '../entities/family-house.entity';
import { Lodge } from '../entities/lodge.entity';
import { FamilyHouseApplicationStatus } from '../enums/lodge.enums';
import { toFamilyHouseView } from '../mappers/lodge.mapper';
import { likeContains } from '../utils/like.util';
import { resolveOptionalLocality } from '../utils/locality.util';

// what a new house is made of; the admin account is switched to the house admin role
export interface NewFamilyHouse {
  name: string;
  fellowship?: string | null;
  address?: string | null;
  stateCode?: string | null;
  stateName?: string | null;
  lgaName?: string | null;
  contactPhone?: string | null;
  description?: string | null;
  adminUserId: string;
}

// super admin: houses, their details and who administers them
@Injectable()
export class FamilyHouseService {
  constructor(
    @InjectRepository(FamilyHouse)
    private readonly houses: Repository<FamilyHouse>,
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(Lodge) private readonly lodges: Repository<Lodge>,
    @InjectRepository(FamilyHouseApplication)
    private readonly applications: Repository<FamilyHouseApplication>,
    private readonly dataSource: DataSource,
    private readonly pagination: PaginationProvider,
    private readonly notifications: NotificationService,
    private readonly locations: LocationService,
    private readonly logger: AppLogger,
  ) {}

  async create(dto: CreateFamilyHouseDto): Promise<FamilyHouseView> {
    const locality = resolveOptionalLocality(
      this.locations,
      dto.stateCode,
      dto.lgaName,
    );
    const { house, admin } = await this.dataSource.transaction((manager) =>
      this.createInTransaction(manager, {
        name: dto.name,
        fellowship: dto.fellowship,
        address: dto.address,
        contactPhone: dto.contactPhone,
        description: dto.description,
        adminUserId: dto.adminUserId,
        ...locality,
      }),
    );
    await this.notifyAdmin(admin.id, house);
    return toFamilyHouseView(house, admin, 0);
  }

  // also used when an application is approved, inside that transaction
  async createInTransaction(
    manager: EntityManager,
    data: NewFamilyHouse,
  ): Promise<{ house: FamilyHouse; admin: User }> {
    const admin = await this.takeUserForAdmin(manager, data.adminUserId);
    const house = await manager.save(
      manager.create(FamilyHouse, {
        name: data.name,
        fellowship: data.fellowship ?? null,
        address: data.address ?? null,
        stateCode: data.stateCode ?? null,
        stateName: data.stateName ?? null,
        lgaName: data.lgaName ?? null,
        contactPhone: data.contactPhone ?? null,
        description: data.description ?? null,
        adminUserId: admin.id,
        isActive: true,
      }),
    );
    return { house, admin };
  }

  async list(
    query: FamilyHouseQueryDto,
    baseUrl: string,
  ): Promise<Paginated<FamilyHouseView>> {
    const qb = this.houses.createQueryBuilder('house').where('1 = 1');
    if (query.isActive !== undefined) {
      qb.andWhere('house.is_active = :active', { active: query.isActive });
    }
    if (query.hasAdmin !== undefined) {
      qb.andWhere(
        query.hasAdmin
          ? 'house.admin_user_id IS NOT NULL'
          : 'house.admin_user_id IS NULL',
      );
    }
    if (query.stateCode) {
      qb.andWhere('house.state_code = :stateCode', {
        stateCode: query.stateCode.toUpperCase(),
      });
    }
    if (query.search) {
      qb.andWhere('house.name ILIKE :term', { term: likeContains(query.search) });
    }
    qb.orderBy('house.createdAt', 'DESC');

    const page = await this.pagination.paginateQuery(qb, query, baseUrl);
    const [admins, counts] = await Promise.all([
      this.adminsOf(page.data),
      this.lodgeCounts(page.data.map((house) => house.id)),
    ]);
    return {
      ...page,
      data: page.data.map((house) =>
        toFamilyHouseView(
          house,
          admins.get(house.adminUserId ?? '') ?? null,
          counts.get(house.id) ?? 0,
        ),
      ),
    };
  }

  async get(id: string): Promise<FamilyHouseView> {
    return this.describe(await this.findHouse(id));
  }

  // used by the house admin's own "me" endpoint
  async describe(house: FamilyHouse): Promise<FamilyHouseView> {
    const [admins, counts] = await Promise.all([
      this.adminsOf([house]),
      this.lodgeCounts([house.id]),
    ]);
    return toFamilyHouseView(
      house,
      admins.get(house.adminUserId ?? '') ?? null,
      counts.get(house.id) ?? 0,
    );
  }

  async update(id: string, dto: UpdateFamilyHouseDto): Promise<FamilyHouseView> {
    const house = await this.findHouse(id);
    const { stateCode, lgaName, ...rest } = dto;
    Object.assign(
      house,
      pickDefined(rest),
      resolveOptionalLocality(this.locations, stateCode, lgaName),
    );
    return this.describe(await this.houses.save(house));
  }

  // dashboard cards
  async stats(): Promise<FamilyHouseStatsView> {
    const [total, active, withoutAdmin, pendingApplications] = await Promise.all([
      this.houses.count(),
      this.houses.count({ where: { isActive: true } }),
      this.houses
        .createQueryBuilder('house')
        .where('house.admin_user_id IS NULL')
        .getCount(),
      this.applications.count({
        where: { status: FamilyHouseApplicationStatus.PENDING },
      }),
    ]);
    return {
      total,
      active,
      inactive: total - active,
      withoutAdmin,
      pendingApplications,
    };
  }

  // moves the house to a new admin; the previous admin goes back to a buyer
  async assignAdmin(id: string, userId: string): Promise<FamilyHouseView> {
    const { house, changed } = await this.dataSource.transaction(
      async (manager) => {
        const house = await manager.findOne(FamilyHouse, {
          where: { id },
          lock: { mode: 'pessimistic_write' },
        });
        if (!house) {
          throw new NotFoundException('Family house not found');
        }
        if (house.adminUserId === userId) {
          return { house, changed: false };
        }
        const admin = await this.takeUserForAdmin(manager, userId);
        await this.demote(manager, house.adminUserId);
        house.adminUserId = admin.id;
        return { house: await manager.save(house), changed: true };
      },
    );
    if (changed) await this.notifyAdmin(userId, house);
    return this.describe(house);
  }

  async removeAdmin(id: string): Promise<FamilyHouseView> {
    const house = await this.dataSource.transaction(async (manager) => {
      const current = await manager.findOne(FamilyHouse, {
        where: { id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!current) {
        throw new NotFoundException('Family house not found');
      }
      await this.demote(manager, current.adminUserId);
      current.adminUserId = null;
      return manager.save(current);
    });
    return this.describe(house);
  }

  // called when a house admin's role is changed elsewhere, so no house keeps a stale admin
  async unlinkAdmin(manager: EntityManager, userId: string): Promise<void> {
    await manager.update(FamilyHouse, { adminUserId: userId }, { adminUserId: null });
  }

  private async findHouse(id: string): Promise<FamilyHouse> {
    const house = await this.houses.findOne({ where: { id } });
    if (!house) {
      throw new NotFoundException('Family house not found');
    }
    return house;
  }

  private async adminsOf(houses: FamilyHouse[]): Promise<Map<string, User>> {
    const ids = houses.flatMap((house) =>
      house.adminUserId ? [house.adminUserId] : [],
    );
    const admins = ids.length
      ? await this.users.find({ where: { id: In(ids) } })
      : [];
    return new Map(admins.map((admin) => [admin.id, admin]));
  }

  // lodges per house in one grouped query (archived lodges are soft-deleted, so not counted)
  private async lodgeCounts(houseIds: string[]): Promise<Map<string, number>> {
    if (!houseIds.length) return new Map();
    const rows = await this.lodges
      .createQueryBuilder('lodge')
      .select('lodge.family_house_id', 'houseId')
      .addSelect('COUNT(*)', 'count')
      .where('lodge.family_house_id IN (:...houseIds)', { houseIds })
      .groupBy('lodge.family_house_id')
      .getRawMany<{ houseId: string; count: string }>();
    return new Map(rows.map((row) => [row.houseId, Number(row.count)]));
  }

  // validates the account and switches it to the family house admin role
  private async takeUserForAdmin(
    manager: EntityManager,
    userId: string,
  ): Promise<User> {
    const user = await manager.findOne(User, {
      where: { id: userId },
      lock: { mode: 'pessimistic_write' },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    if (user.isSuspended) {
      throw new ConflictException('This account is suspended');
    }
    if (user.role !== UserRole.BUYER && user.role !== UserRole.FAMILY_HOUSE_ADMIN) {
      throw new ConflictException(
        `A ${user.role} account cannot become a family house admin. Use a regular (buyer) account`,
      );
    }
    const existing = await manager.findOne(FamilyHouse, {
      where: { adminUserId: user.id },
    });
    if (existing) {
      throw new ConflictException('This user already administers a family house');
    }
    user.role = UserRole.FAMILY_HOUSE_ADMIN;
    return manager.save(user);
  }

  private async demote(
    manager: EntityManager,
    userId: string | null,
  ): Promise<void> {
    if (!userId) return;
    await manager.update(
      User,
      { id: userId, role: UserRole.FAMILY_HOUSE_ADMIN },
      { role: UserRole.BUYER },
    );
  }

  // a failed notification must never undo the assignment
  private async notifyAdmin(userId: string, house: FamilyHouse): Promise<void> {
    try {
      await this.notifications.send({
        userId,
        type: NotificationType.GENERIC,
        title: 'You are now a family house admin',
        body: `You can now manage corpers' lodges for ${house.name}. Sign in again to refresh your access.`,
        data: { familyHouseId: house.id },
      });
    } catch (error) {
      this.logger.warn(
        `Could not notify new admin of house ${house.id}: ${String(error)}`,
        FamilyHouseService.name,
      );
    }
  }
}
