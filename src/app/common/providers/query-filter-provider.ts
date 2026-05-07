import { Injectable, BadRequestException } from '@nestjs/common';
import { ObjectLiteral, SelectQueryBuilder } from 'typeorm';

export interface BaseFilterDto {
  search?: string;
  startDate?: Date;
  endDate?: Date;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

export interface QueryFilterConfig {
  alias: string;

  searchableFields?: string[];

  allowedSortFields?: string[];
  allowedBooleanFields?: string[];

  
  allowedEnumFields?: Record<string, readonly (string | number)[]>;

  dateField?: string;

  secondaryAliases?: Record<string, string>;
}

type FilterValue = string | number | boolean | undefined;
type FilterMap = Record<string, FilterValue>;

@Injectable()
export class QueryFilterProvider {
  applyFilters<T extends ObjectLiteral>(
    queryBuilder: SelectQueryBuilder<T>,
    filters: BaseFilterDto,
    config: QueryFilterConfig,
  ): SelectQueryBuilder<T> {
    const {
      alias,
      searchableFields = [],
      allowedSortFields = [],
      allowedBooleanFields = [],
      allowedEnumFields = {},
      dateField = 'createdAt',
      secondaryAliases = {},
    } = config;

    const f = filters as unknown as FilterMap;

    // ---------------- SEARCH ----------------
    if (filters.search && searchableFields.length) {
      const conditions = searchableFields
        .map((field) => {
          if (field.includes(':')) {
            const [aliasKey, column] = field.split(':');
            const resolvedAlias = secondaryAliases[aliasKey] || alias;

            return `LOWER(${resolvedAlias}.${column}) LIKE LOWER(:search)`;
          }

          if (field.includes('.')) {
            return `LOWER(${field}) LIKE LOWER(:search)`;
          }

          return `LOWER(${alias}.${field}) LIKE LOWER(:search)`;
        })
        .join(' OR ');

      queryBuilder.andWhere(`(${conditions})`, {
        search: `%${filters.search}%`,
      });
    }

    // ---------------- DATE FILTER ----------------
    if (filters.startDate) {
      queryBuilder.andWhere(`${alias}.${dateField} >= :startDate`, {
        startDate: filters.startDate,
      });
    }

    if (filters.endDate) {
      const endDate = new Date(filters.endDate);
      endDate.setHours(23, 59, 59, 999);

      queryBuilder.andWhere(`${alias}.${dateField} <= :endDate`, {
        endDate,
      });
    }

    // ---------------- BOOLEAN FILTERS ----------------
    for (const field of allowedBooleanFields) {
      const value = f[field];

      if (value !== undefined) {
        queryBuilder.andWhere(`${alias}.${field} = :${field}`, {
          [field]: value,
        });
      }
    }

    // ---------------- ENUM FILTERS (FIXED) ----------------
    for (const field in allowedEnumFields) {
      const value = f[field];
      const enumValues = allowedEnumFields[field];

      if (value !== undefined) {
        if (!enumValues.includes(value as string | number)) {
          throw new BadRequestException(`Invalid value for ${field}`);
        }

        queryBuilder.andWhere(`${alias}.${field} = :${field}`, {
          [field]: value,
        });
      }
    }

    // ---------------- SORTING ----------------
    const sortMap: Record<string, string> = {
      newest: `${alias}.createdAt`,
      'price-asc': `${alias}.price`,
      'price-desc': `${alias}.price`,
      popular: `${alias}.views`,
    };

    if (filters.sortBy) {
      const mappedSortField =
        sortMap[filters.sortBy] ||
        (filters.sortBy.includes('.')
          ? filters.sortBy
          : `${alias}.${filters.sortBy}`);

      if (
        allowedSortFields.length &&
        !allowedSortFields.includes(filters.sortBy)
      ) {
        throw new BadRequestException(
          `Sorting by '${filters.sortBy}' is not allowed`,
        );
      }

      const order =
        filters.sortOrder?.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

      queryBuilder.orderBy(mappedSortField, order);
    } else {
      queryBuilder.orderBy(`${alias}.${dateField}`, 'DESC');
    }

    return queryBuilder;
  }
}
