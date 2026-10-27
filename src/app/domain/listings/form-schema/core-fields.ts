import {
  DESCRIPTION_MAX_LENGTH,
  DESCRIPTION_MIN_LENGTH,
  LISTING_PHOTO_FORMATS,
  MAX_PHOTOS_PER_LISTING,
  MAX_PHOTO_SIZE_MB,
  MIN_PHOTOS_TO_PUBLISH,
  TITLE_MAX_LENGTH,
  TITLE_MIN_LENGTH,
  VIDEO_URL_MAX_LENGTH,
} from '../constants/listing.constants';
import {
  NEGOTIATION_LABELS,
  NegotiationStatus,
} from '../enums/negotiation-status.enum';
import { FormField } from './form-schema.types';
import { enumOptions } from './option.utils';

/**
 * Building blocks for the fields every category shares. A category handler
 * composes its form by placing these among its own fields, so it controls the
 * order (e.g. price sits between "Description" and "Negotiable").
 */
export const coreFields = {
  title: (): FormField => ({
    key: 'title',
    label: 'Title',
    type: 'text',
    required: true,
    helperText: 'Please write a clear title for your item',
    minLength: TITLE_MIN_LENGTH,
    maxLength: TITLE_MAX_LENGTH,
  }),

  photos: (): FormField => ({
    key: 'images',
    label: `Add at least ${MIN_PHOTOS_TO_PUBLISH} photos`,
    type: 'photos',
    required: true,
    helperText:
      'First picture - is the title picture. Drag to reorder. ' +
      `Each picture must not exceed ${MAX_PHOTO_SIZE_MB} Mb`,
    minItems: MIN_PHOTOS_TO_PUBLISH,
    maxItems: MAX_PHOTOS_PER_LISTING,
    accept: [...LISTING_PHOTO_FORMATS],
    maxFileSizeMb: MAX_PHOTO_SIZE_MB,
  }),

  videoUrl: (): FormField => ({
    key: 'videoUrl',
    label: 'Link to Youtube or Facebook video',
    type: 'url',
    required: false,
    maxLength: VIDEO_URL_MAX_LENGTH,
  }),

  location: (label: string): FormField => ({
    key: 'location',
    label,
    type: 'location',
    required: true,
  }),

  description: (): FormField => ({
    key: 'description',
    label: 'Description',
    type: 'textarea',
    required: true,
    helperText:
      'Please provide a detailed description. Mentioning as many details as possible will make your Ad more attractive to buyers',
    minLength: DESCRIPTION_MIN_LENGTH,
    maxLength: DESCRIPTION_MAX_LENGTH,
  }),

  price: (): FormField => ({
    key: 'price',
    label: 'Price',
    type: 'number',
    required: true,
    min: 1,
    helperText: 'Amount in Naira',
  }),

  negotiable: (): FormField => ({
    key: 'negotiable',
    label: 'Are you open to negotiation?',
    type: 'radio',
    required: false,
    options: enumOptions(NEGOTIATION_LABELS),
    defaultValue: NegotiationStatus.NOT_SURE,
  }),
};