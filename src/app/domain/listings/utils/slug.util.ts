import { randomBytes } from 'crypto';
import slugify from 'slugify';

const SLUG_BASE_MAX_LENGTH = 140;

// title-based slug plus a random suffix, so two identical titles never collide
export function buildListingSlug(title: string): string {
  const base =
    slugify(title, { lower: true, strict: true }).slice(
      0,
      SLUG_BASE_MAX_LENGTH,
    ) || 'listing';
  return `${base}-${randomBytes(5).toString('hex')}`;
}
