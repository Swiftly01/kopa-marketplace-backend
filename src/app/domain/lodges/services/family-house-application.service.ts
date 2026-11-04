import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { UserRole } from '../../../common/enums/roles-enum';
import { Paginated } from '../../../common/pagination/interfaces/paginated.interface';
import { PaginationProvider } from '../../../common/pagination/providers/pagination.provider';
import { AppLogger } from '../../../logger/logger.service';
import { NotificationType } from '../../../notification/enums/notification-type.enum';
import { NotificationService } from '../../../notification/services/notification.service';
import { LocationService } from '../../location/location.service';
import { User } from '../../users/entities/user.entity';
import {
  ApplicationQueryDto,
  CreateFamilyHouseApplicationDto,
} from '../dtos/family-house-application.dto';
import { FamilyHouseApplicationView } from '../dtos/lodge-response.dto';
import { FamilyHouseApplication } from '../entities/family-house-application.entity';
import { FamilyHouseApplicationStatus } from '../enums/lodge.enums';
import { toApplicationView } from '../mappers/lodge.mapper';
import { likeContains } from '../utils/like.util';
import { FamilyHouseService } from './family-house.service';

const WITH_PEOPLE = { applicant: true, familyHouse: true } as const;

// "register my family house": a user applies, a super admin approves or rejects
@Injectable()
export class FamilyHouseApplicationService {
  constructor(
    @InjectRepository(FamilyHouseApplication)
    private readonly applications: Repository<FamilyHouseApplication>,
    @InjectRepository(User) private readonly users: Repository<User>,
    private readonly dataSource: DataSource,
    private readonly pagination: PaginationProvider,
    private readonly notifications: NotificationService,
    private readonly locations: LocationService,
    private readonly familyHouses: FamilyHouseService,
    private readonly logger: AppLogger,
  ) {}

  // ---- applicant ----

  async apply(
    userId: string,
    dto: CreateFamilyHouseApplicationDto,
  ): Promise<FamilyHouseApplicationView> {
    const user = await this.users.findOne({ where: { id: userId } });
    if (!user || user.isSuspended) {
      throw new NotFoundException('User not found');
    }
    // same rule as house admins: a plain (buyer) account
    if (user.role !== UserRole.BUYER) {
      throw new ConflictException(
        user.role === UserRole.FAMILY_HOUSE_ADMIN
          ? 'You already administer a family house'
          : `A ${user.role} account cannot apply for a family house. Use a regular (buyer) account`,
      );
    }
    const locality = this.locations.resolveLocality(dto.stateCode, dto.lgaName);

    try {
      const saved = await this.applications.save(
        this.applications.create({
          applicantUserId: userId,
          houseName: dto.houseName,
          fellowship: dto.fellowship ?? null,
          address: dto.address,
          contactPhone: dto.contactPhone,
          description: dto.description ?? null,
          stateCode: locality.stateCode,
          stateName: locality.stateName,
          lgaName: locality.lgaName,
          status: FamilyHouseApplicationStatus.PENDING,
        }),
      );
      return this.view(saved.id);
    } catch (error) {
      // the partial unique index allows one open application per person
      if ((error as { code?: string }).code === '23505') {
        throw new ConflictException('You already have a pending application');
      }
      throw error;
    }
  }

  async listMine(userId: string): Promise<FamilyHouseApplicationView[]> {
    const mine = await this.applications.find({
      where: { applicantUserId: userId },
      relations: WITH_PEOPLE,
      order: { createdAt: 'DESC' },
    });
    return mine.map(toApplicationView);
  }

  // ---- super admin ----

  async list(
    query: ApplicationQueryDto,
    baseUrl: string,
  ): Promise<Paginated<FamilyHouseApplicationView>> {
    const qb = this.applications
      .createQueryBuilder('application')
      // only the applicant's contact details, never the whole account
      .leftJoin('application.applicant', 'applicant')
      .addSelect([
        'applicant.id',
        'applicant.email',
        'applicant.firstName',
        'applicant.lastName',
        'applicant.phoneNumber',
      ])
      .leftJoinAndSelect('application.familyHouse', 'familyHouse')
      .where('1 = 1');

    if (query.status) {
      qb.andWhere('application.status = :status', { status: query.status });
    }
    if (query.search) {
      qb.andWhere(
        '(application.houseName ILIKE :term OR applicant.email ILIKE :term OR applicant.firstName ILIKE :term OR applicant.lastName ILIKE :term)',
        { term: likeContains(query.search) },
      );
    }
    // the review queue runs oldest first; history runs newest first
    qb.orderBy(
      'application.createdAt',
      query.status === FamilyHouseApplicationStatus.PENDING ? 'ASC' : 'DESC',
    );

    const page = await this.pagination.paginateQuery(qb, query, baseUrl);
    return { ...page, data: page.data.map(toApplicationView) };
  }

  // counts for the tabs above the list
  async counts(): Promise<Record<FamilyHouseApplicationStatus, number>> {
    const rows = await this.applications
      .createQueryBuilder('application')
      .select('application.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('application.status')
      .getRawMany<{ status: FamilyHouseApplicationStatus; count: string }>();

    const result = {
      [FamilyHouseApplicationStatus.PENDING]: 0,
      [FamilyHouseApplicationStatus.APPROVED]: 0,
      [FamilyHouseApplicationStatus.REJECTED]: 0,
    };
    rows.forEach((row) => (result[row.status] = Number(row.count)));
    return result;
  }

  async get(id: string): Promise<FamilyHouseApplicationView> {
    return this.view(id);
  }

  // creates the house and makes the applicant its admin, all or nothing
  async approve(id: string, reviewerId: string): Promise<FamilyHouseApplicationView> {
    const { application, house } = await this.dataSource.transaction(
      async (manager) => {
        // locked without joins: Postgres cannot lock the nullable side of an outer join
        const current = await manager.findOne(FamilyHouseApplication, {
          where: { id },
          lock: { mode: 'pessimistic_write' },
        });
        if (!current) {
          throw new NotFoundException('Application not found');
        }
        this.assertPending(current);

        const { house } = await this.familyHouses.createInTransaction(manager, {
          name: current.houseName,
          fellowship: current.fellowship,
          address: current.address,
          stateCode: current.stateCode,
          stateName: current.stateName,
          lgaName: current.lgaName,
          contactPhone: current.contactPhone,
          description: current.description,
          adminUserId: current.applicantUserId,
        });

        current.status = FamilyHouseApplicationStatus.APPROVED;
        current.familyHouseId = house.id;
        current.reviewedBy = reviewerId;
        current.reviewedAt = new Date();
        current.rejectionReason = null;
        return { application: await manager.save(current), house };
      },
    );

    await this.notify(application.applicantUserId, {
      title: 'Your family house is approved',
      body: `${house.name} has been approved. Sign in again to open your lodge dashboard.`,
      data: { applicationId: id, familyHouseId: house.id },
    });
    return this.view(id);
  }

  async reject(
    id: string,
    reviewerId: string,
    reason: string,
  ): Promise<FamilyHouseApplicationView> {
    const application = await this.dataSource.transaction(async (manager) => {
      const current = await manager.findOne(FamilyHouseApplication, {
        where: { id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!current) {
        throw new NotFoundException('Application not found');
      }
      this.assertPending(current);
      current.status = FamilyHouseApplicationStatus.REJECTED;
      current.rejectionReason = reason;
      current.reviewedBy = reviewerId;
      current.reviewedAt = new Date();
      return manager.save(current);
    });

    await this.notify(application.applicantUserId, {
      title: 'Family house application declined',
      body: `${application.houseName}: ${reason}`,
      data: { applicationId: id },
    });
    return this.view(id);
  }

  private assertPending(application: FamilyHouseApplication): void {
    if (application.status !== FamilyHouseApplicationStatus.PENDING) {
      throw new ConflictException(
        `This application was already ${application.status}`,
      );
    }
  }

  private async view(id: string): Promise<FamilyHouseApplicationView> {
    const application = await this.applications.findOne({
      where: { id },
      relations: WITH_PEOPLE,
    });
    if (!application) {
      throw new NotFoundException('Application not found');
    }
    return toApplicationView(application);
  }

  // a failed notification must never undo or fail the decision
  private async notify(
    userId: string,
    message: { title: string; body: string; data: Record<string, unknown> },
  ): Promise<void> {
    try {
      await this.notifications.send({
        userId,
        type: NotificationType.GENERIC,
        ...message,
      });
    } catch (error) {
      this.logger.warn(
        `Could not notify applicant ${userId}: ${String(error)}`,
        FamilyHouseApplicationService.name,
      );
    }
  }
}
