import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../domain/users/entities/user.entity';
import { QueryFilterProvider } from '../../common/providers/query-filter-provider';
import { PaginationProvider } from '../../common/pagination/providers/pagination.provider';
import { RecipientBatchService } from './recipient-batch.service';
import { MAX_BATCH_RECIPIENTS } from '../constant';
import { UserStatus } from '../../common/enums/user-status.enum';
import { BatchFeature } from '../enums/batch-feature.enum';
import { FilterUsersDto } from '../../domain/admin/dtos/filter-users-dto';

export interface RecipientOption {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  alreadyProcessed: boolean;
}

@Injectable()
export class RecipientSelectionService {
  constructor(
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    private readonly queryFilterProvider: QueryFilterProvider,
    private readonly paginationProvider: PaginationProvider,
    private readonly batchService: RecipientBatchService,
  ) {}

  async search(
    feature: BatchFeature,
    adminId: string,
    query: FilterUsersDto,
    baseUrl?: string,
  ) {
    let qb = this.userRepository
      .createQueryBuilder('user')
      .select([
        'user.id',
        'user.email',
        'user.firstName',
        'user.lastName',
        'user.role',
        'user.status',
      ])
      .where('user.status = :status', { status: UserStatus.Active });

    qb = this.queryFilterProvider.applyFilters(qb, query, {
      alias: 'user',
      searchableFields: ['email', 'firstName', 'lastName'],
      allowedSortFields: ['email', 'firstName', 'lastName', 'createdAt'],
      dateField: 'createdAt',
    });

    const paginated = await this.paginationProvider.paginateQuery(
      qb,
      query,
      baseUrl,
    );

    const processedIds = new Set(
      await this.batchService.getProcessedUserIds(feature, adminId),
    );

    const data: RecipientOption[] = paginated.data.map((user) => ({
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      alreadyProcessed: processedIds.has(user.id),
    }));

    return {
      ...paginated,
      data,
      meta: {
        ...paginated.meta,
        maxRecipientsPerBatch: MAX_BATCH_RECIPIENTS,
        processedUserCount: processedIds.size,
      },
    };
  }
}
