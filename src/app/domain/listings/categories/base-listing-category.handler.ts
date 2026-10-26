import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import {
  DeepPartial,
  EntityManager,
  EntityTarget,
  FindOptionsSelect,
  FindOptionsWhere,
  ObjectLiteral,
} from 'typeorm';
import { FormField } from '../form-schema/form-schema.types';
import {
  flattenValidationErrors,
  validationException,
} from '../utils/validation-errors';
import {
  ListingCategoryHandler,
  ListingDetails,
} from './listing-category-handler.interface';

// every details table has its own id and a unique listingId
type DetailsRow = ObjectLiteral & { id: string; listingId: string };

// shared plumbing: a category only declares its DTO, entity, mapping and form
export abstract class BaseListingCategoryHandler<
  TInput extends object,
  TRow extends DetailsRow,
> implements ListingCategoryHandler {
  abstract readonly categoryCode: string;
  abstract readonly formVersion: number;

  // class-validator DTO describing the `details` payload
  protected abstract readonly detailsDto: new () => TInput;
  // entity holding this category's details table
  protected abstract readonly detailsEntity: EntityTarget<TRow>;

  abstract buildFormFields(): FormField[];
  // maps validated input to a full row, using null for omitted optional columns
  protected abstract toRow(listingId: string, input: TInput): DeepPartial<TRow>;
  // maps a stored row to the shape returned to clients
  protected abstract toView(row: TRow): Record<string, unknown>;

  async validateDetails(raw: unknown): Promise<ListingDetails> {
    if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
      throw validationException([
        { field: 'details', message: 'details must be an object' },
      ]);
    }

    const instance = plainToInstance(this.detailsDto, raw);
    const errors = await validate(instance, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });

    if (errors.length > 0) {
      throw validationException(flattenValidationErrors(errors, 'details.'));
    }
    return instance;
  }

  async saveDetails(
    manager: EntityManager,
    listingId: string,
    details: ListingDetails,
  ): Promise<void> {
    // validateDetails is the only source of `details`, so the cast is safe
    const row = this.toRow(listingId, details as TInput);
    const repository = manager.getRepository(this.detailsEntity);
    // the row has no id, so reuse the existing one; otherwise save() would INSERT a second row
    const existing = await repository.findOne({
      where: { listingId } as FindOptionsWhere<TRow>,
      select: { id: true } as FindOptionsSelect<TRow>,
    });
    await repository.save(existing ? { ...row, id: existing.id } : row);
  }

  async findDetails(
    manager: EntityManager,
    listingId: string,
  ): Promise<Record<string, unknown> | null> {
    const row = await manager
      .getRepository(this.detailsEntity)
      .createQueryBuilder('details')
      .where('details.listingId = :listingId', { listingId })
      .getOne();
    return row ? this.toView(row) : null;
  }
}
