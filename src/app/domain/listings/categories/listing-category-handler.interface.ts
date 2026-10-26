import { EntityManager } from 'typeorm';
import { FormField } from '../form-schema/form-schema.types';

// validated, category-specific input; only validateDetails produces one
export type ListingDetails = object;

// everything the core needs from a category; the core never imports a concrete category
export interface ListingCategoryHandler {
  // matches categories.code of the leaf category this handler serves
  readonly categoryCode: string;
  // bump when the form changes in a way clients should notice
  readonly formVersion: number;
  // true for the one handler that serves every category without a handler of its own
  readonly isFallback?: boolean;

  // ordered fields of the "Post new ad" form (core + category specific)
  buildFormFields(): FormField[];
  // validates the raw `details` payload and throws a 400 listing every bad field
  validateDetails(raw: unknown): Promise<ListingDetails>;
  // inserts or fully replaces the details row inside the caller's transaction
  saveDetails(
    manager: EntityManager,
    listingId: string,
    details: ListingDetails,
  ): Promise<void>;
  // public shape of the stored details, or null when none exist
  findDetails(
    manager: EntityManager,
    listingId: string,
  ): Promise<Record<string, unknown> | null>;
}

// Nest injection token holding every registered handler
export const LISTING_CATEGORY_HANDLERS = Symbol('LISTING_CATEGORY_HANDLERS');
