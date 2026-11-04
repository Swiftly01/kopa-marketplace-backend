import {
  LODGE_BOOKING_CLOUDINARY_ROOT,
  LODGE_CLOUDINARY_ROOT,
} from '../constants/lodge.constants';

// lodges/<familyHouseId>/<lodgeId>
export const lodgePhotoFolder = (familyHouseId: string, lodgeId: string) =>
  `${LODGE_CLOUDINARY_ROOT}/${familyHouseId}/${lodgeId}`;

// lodge-bookings/<lodgeId>/<corperId>
export const bookingDocumentFolder = (lodgeId: string, corperId: string) =>
  `${LODGE_BOOKING_CLOUDINARY_ROOT}/${lodgeId}/${corperId}`;
