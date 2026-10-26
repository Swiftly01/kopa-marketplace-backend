/**
 * Platform-wide rules for classified listings.
 * Category-specific rules live next to their category handler.
 */

/** A listing cannot be published with fewer photos than this. */
export const MIN_PHOTOS_TO_PUBLISH = 5;

/** Upper bound on photos per listing. */
export const MAX_PHOTOS_PER_LISTING = 20;

/** Per-photo size cap (matches the "Each picture must not exceed 10 Mb" hint). */
export const MAX_PHOTO_SIZE_MB = 10;
export const MAX_PHOTO_SIZE_BYTES = MAX_PHOTO_SIZE_MB * 1024 * 1024;

/** JPG, PNG, HEIC and WEBP are accepted (HEIC = iPhone photos). */
export const LISTING_PHOTO_FORMATS = [
  'jpg',
  'jpeg',
  'png',
  'webp',
  'heic',
  'heif',
] as const;

export const TITLE_MIN_LENGTH = 5;
export const TITLE_MAX_LENGTH = 100;
export const DESCRIPTION_MIN_LENGTH = 10;
export const DESCRIPTION_MAX_LENGTH = 850;
export const VIDEO_URL_MAX_LENGTH = 1024;

/** Prices are whole Naira stored as bigint; stay inside JS safe integers. */
export const MAX_PRICE = Number.MAX_SAFE_INTEGER;

/** Cloudinary folder root for listing photos: listings/<userId>/<listingId> */
export const LISTING_CLOUDINARY_ROOT = 'kopamart/listings';

/** Only YouTube and Facebook video links are accepted. */
export const VIDEO_URL_PATTERN =
  /^https?:\/\/(www\.|m\.)?(youtube\.com|youtu\.be|facebook\.com|fb\.watch)\/\S+$/i;
