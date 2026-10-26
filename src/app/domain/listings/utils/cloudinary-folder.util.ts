import { LISTING_CLOUDINARY_ROOT } from '../constants/listing.constants';

// listings/<userId>/<listingId>, matching the folder note in listing.constants
export function listingPhotoFolder(userId: string, listingId: string): string {
  return `${LISTING_CLOUDINARY_ROOT}/${userId}/${listingId}`;
}
