import { Injectable } from '@nestjs/common';
import { ObjectLiteral, SelectQueryBuilder } from 'typeorm';
import { PaginationQueryDto } from '../dtos/pagination-query.dto';
import { Paginated } from '../interfaces/paginated.interface';

@Injectable()
export class PaginationProvider {
  public async paginateQuery<T extends ObjectLiteral>(
    queryBuilder: SelectQueryBuilder<T>,
    paginateQuery: PaginationQueryDto,
    baseUrl?: string,
  ): Promise<Paginated<T>> {
    const page = paginateQuery.page ?? 1;
    const limit = paginateQuery.limit ?? 10;

    // FIRST: calculate pagination
    const skip = (page - 1) * limit;

    // APPLY BEFORE EXECUTION
    queryBuilder.skip(skip).take(limit);

    // THEN execute query
    const [results, totalItems] = await queryBuilder.getManyAndCount();

    const totalPages = Math.max(1, Math.ceil(totalItems / limit));
    const safePage = Math.min(page, totalPages);

    const base = baseUrl ? new URL(baseUrl) : null;

    const buildLink = (p: number): string | null => {
      if (!base) return null;

      const url = new URL(base.toString());

      url.searchParams.delete('page');
      url.searchParams.delete('limit');

      url.searchParams.set('page', String(p));
      url.searchParams.set('limit', String(limit));

      return url.toString();
    };

    const links: Paginated<T>['links'] = {
      first: buildLink(1),
      last: buildLink(totalPages),
      current: buildLink(safePage),
    };

    if (safePage < totalPages) {
      links.next = buildLink(safePage + 1);
    }

    if (safePage > 1) {
      links.previous = buildLink(safePage - 1);
    }

    return {
      data: results,
      meta: {
        itemsPerPage: limit,
        totalItems,
        currentPage: safePage,
        totalPages,
      },
      links,
    };
  }
}
