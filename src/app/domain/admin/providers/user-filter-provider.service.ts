import { Injectable } from '@nestjs/common';
import { ObjectLiteral, SelectQueryBuilder } from 'typeorm';
import { FilterUsersDto } from '../dtos/filter-users-dto';

@Injectable()
export class UserFilterProvider {
  applyFilters<T extends ObjectLiteral>(
    queryBuilder: SelectQueryBuilder<T>,
    filters: FilterUsersDto,
    config: {
      alias: string;
      searchFields?: string[];
      dateField?: string;
    },
  ): SelectQueryBuilder<T> {
    const { alias, searchFields = [], dateField = 'createdAt' } = config;

    if (filters.role) {
      queryBuilder.andWhere(`${alias}.role = :role`, { role: filters.role });
    }

    if (filters.search && searchFields.length) {
      const conditions = searchFields
        .map((field) => `LOWER(${field}) LIKE LOWER(:search)`)
        .join('OR');

      queryBuilder.andWhere(`(${conditions})`, {
        search: `%${filters.search}`,
      });
    }

    if (filters.startDate) {
      queryBuilder.andWhere(`${alias}.${dateField} >= :startDate`, {
        startDate: filters.startDate,
      });
    }

    if (filters.endDate) {
      queryBuilder.andWhere(`${alias}.${dateField} <= :endDate`, {
        endDate: filters.endDate,
      });
    }

    return queryBuilder;
  }
}
