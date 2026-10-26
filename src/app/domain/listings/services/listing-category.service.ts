import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category } from '../../category/entities/category.entity';
import { ListingCategoryHandler } from '../categories/listing-category-handler.interface';
import { ListingCategoryRegistry } from '../categories/listing-category.registry';
import { ListingFormSchema } from '../form-schema/form-schema.types';

export interface PostableCategoryNode {
  id: string;
  code: string;
  name: string;
  slug: string;
  icon: string | null;
  // true when listings can be posted straight into this category
  postable: boolean;
  children: PostableCategoryNode[];
}

// answers "where can I post?" and "what does the form look like?"
@Injectable()
export class ListingCategoryService {
  constructor(
    @InjectRepository(Category)
    private readonly categories: Repository<Category>,
    private readonly registry: ListingCategoryRegistry,
  ) {}

  // category tree limited to branches that lead to a postable category
  async getPostableCategories(): Promise<PostableCategoryNode[]> {
    const all = await this.loadActive();
    const isPostable = this.postableChecker(all);

    const build = (parentId: string | null): PostableCategoryNode[] =>
      all
        .filter((category) => category.parentId === parentId)
        .map((category) => ({
          id: category.id,
          code: category.code,
          name: category.name,
          slug: category.slug,
          icon: category.icon,
          postable: isPostable(category),
          children: build(category.id),
        }))
        .filter((node) => node.postable || node.children.length > 0);

    return build(null);
  }

  // the category plus every category below it, so "Property" also finds ads posted in its children
  async getBranchIds(filter: {
    categoryId?: string;
    categorySlug?: string;
  }): Promise<string[] | null> {
    if (!filter.categoryId && !filter.categorySlug) {
      return null;
    }
    const root = await this.categories.findOne({
      where: filter.categoryId
        ? { id: filter.categoryId }
        : { slug: filter.categorySlug },
      select: { id: true },
    });
    if (!root) {
      return [];
    }

    const all = await this.categories.find({
      select: { id: true, parentId: true },
    });
    const ids = [root.id];
    // walk down level by level; the category tree is only a few levels deep
    for (let i = 0; i < ids.length; i++) {
      for (const category of all) {
        if (category.parentId === ids[i] && !ids.includes(category.id)) {
          ids.push(category.id);
        }
      }
    }
    return ids;
  }

  async getFormSchema(categoryId: string): Promise<ListingFormSchema> {
    const { category, handler } = await this.requirePostable(categoryId);
    return {
      category: { id: category.id, code: category.code, name: category.name },
      version: handler.formVersion,
      fields: handler.buildFormFields(),
    };
  }

  // an active category you can post into, or a 404 / 400 explaining why not
  async requirePostable(
    categoryId: string,
  ): Promise<{ category: Category; handler: ListingCategoryHandler }> {
    const all = await this.loadActive();
    const category = all.find((item) => item.id === categoryId);
    if (!category) {
      throw new NotFoundException('Category not found');
    }
    if (!this.postableChecker(all)(category)) {
      throw new BadRequestException(
        'This category does not accept listings yet',
      );
    }
    return { category, handler: this.registry.get(category.code) };
  }

  private loadActive(): Promise<Category[]> {
    return this.categories.find({
      where: { isActive: true },
      order: { sortOrder: 'ASC', name: 'ASC' },
    });
  }

  // A category is postable when it has its own form, or when it is a leaf that
  // the fallback form can serve. Branches that own a specific form (like
  // Property) never fall back, so their other leaves wait for their own form.
  private postableChecker(all: Category[]): (category: Category) => boolean {
    const byId = new Map(all.map((category) => [category.id, category]));
    const rootIdOf = (category: Category): string => {
      let current = category;
      // the guard stops a corrupted parent loop from hanging the request
      for (let depth = 0; depth < 20 && current.parentId; depth++) {
        const parent = byId.get(current.parentId);
        if (!parent) break;
        current = parent;
      }
      return current.id;
    };

    const reservedRoots = new Set(
      all.filter((category) => this.registry.has(category.code)).map(rootIdOf),
    );
    const parents = new Set(all.map((category) => category.parentId));

    return (category) =>
      this.registry.has(category.code) ||
      (this.registry.hasFallback &&
        !parents.has(category.id) &&
        !reservedRoots.has(rootIdOf(category)));
  }
}
