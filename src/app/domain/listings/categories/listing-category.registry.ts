import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import {
  LISTING_CATEGORY_HANDLERS,
  ListingCategoryHandler,
} from './listing-category-handler.interface';

@Injectable()
export class ListingCategoryRegistry {
  private readonly handlers = new Map<string, ListingCategoryHandler>();
  private readonly fallback: ListingCategoryHandler | null;

  constructor(
    @Inject(LISTING_CATEGORY_HANDLERS) handlers: ListingCategoryHandler[],
  ) {
    const fallbacks = handlers.filter((handler) => handler.isFallback);
    // fail at boot: two fallbacks would make "which form?" ambiguous
    if (fallbacks.length > 1) {
      throw new Error('Only one fallback listing handler is allowed');
    }
    this.fallback = fallbacks[0] ?? null;

    for (const handler of handlers) {
      if (handler.isFallback) continue;
      // fail at boot, not at the first post, when two handlers claim one category
      if (this.handlers.has(handler.categoryCode)) {
        throw new Error(
          `Duplicate listing handler for category "${handler.categoryCode}"`,
        );
      }
      this.handlers.set(handler.categoryCode, handler);
    }
  }

  // true only for categories with a form of their own (not the fallback)
  has(categoryCode: string): boolean {
    return this.handlers.has(categoryCode);
  }

  // the category's own handler, else the fallback, else null
  find(categoryCode: string): ListingCategoryHandler | null {
    return this.handlers.get(categoryCode) ?? this.fallback;
  }

  get(categoryCode: string): ListingCategoryHandler {
    const handler = this.find(categoryCode);
    if (!handler) {
      throw new BadRequestException(
        'This category does not accept listings yet',
      );
    }
    return handler;
  }

  get hasFallback(): boolean {
    return this.fallback !== null;
  }
}
