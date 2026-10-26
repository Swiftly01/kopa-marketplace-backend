import { coreFields } from '../../form-schema/core-fields';
import { field } from '../../form-schema/field-builders';
import { FormField } from '../../form-schema/form-schema.types';
import { enumOptions, numberOptions } from '../../form-schema/option.utils';
import {
  ADDRESS_MAX_LENGTH,
  ESTATE_NAME_MAX_LENGTH,
  MAX_BATHROOMS,
  MAX_BEDROOMS,
  MAX_TOILETS,
  POPULAR_BATHROOMS,
  POPULAR_BEDROOMS,
  PROPERTY_SIZE_MAX_LENGTH,
} from './property-rent.constants';
import {
  FACILITY_LABELS,
  FURNISHING_LABELS,
  LISTED_BY_LABELS,
  MINIMUM_RENTAL_PERIOD_LABELS,
  PRICE_PERIOD_LABELS,
  PricePeriod,
  PROPERTY_CONDITION_LABELS,
  PROPERTY_TYPE_LABELS,
} from './property-rent.enums';

// field order mirrors the "Post new ad" screen top to bottom
export function buildPropertyRentForm(): FormField[] {
  return [
    coreFields.title(),
    coreFields.photos(),
    coreFields.videoUrl(),
    coreFields.location('Property locality'),
    field.text('details.address', 'Property Address', {
      required: true,
      maxLength: ADDRESS_MAX_LENGTH,
      helperText: 'e.g 12, Gwani Street',
    }),
    field.text('details.estateName', 'Estate Name', {
      maxLength: ESTATE_NAME_MAX_LENGTH,
      helperText: 'e.g Emerald Estate',
    }),
    field.text('details.propertySize', 'Property Size', {
      maxLength: PROPERTY_SIZE_MAX_LENGTH,
    }),
    field.select(
      'details.propertyType',
      'Property Type',
      enumOptions(PROPERTY_TYPE_LABELS),
      { required: true, searchable: true },
    ),
    field.select(
      'details.condition',
      'Condition',
      enumOptions(PROPERTY_CONDITION_LABELS),
      { required: true },
    ),
    field.select(
      'details.furnishing',
      'Furnishing',
      enumOptions(FURNISHING_LABELS),
      { required: true },
    ),
    field.select(
      'details.bedrooms',
      'Bedrooms',
      numberOptions(1, MAX_BEDROOMS, POPULAR_BEDROOMS),
      { required: true, searchable: true },
    ),
    field.select(
      'details.bathrooms',
      'Bathrooms',
      numberOptions(1, MAX_BATHROOMS, POPULAR_BATHROOMS),
      { required: true, searchable: true },
    ),
    field.select('details.toilets', 'Toilets', numberOptions(1, MAX_TOILETS), {
      searchable: true,
    }),
    field.multiselect(
      'details.facilities',
      'Facilities',
      enumOptions(FACILITY_LABELS),
      { searchable: true },
    ),
    field.select(
      'details.listedBy',
      'Listing by',
      enumOptions(LISTED_BY_LABELS),
    ),
    field.checkbox('details.serviceCharge', 'Service Charge', {
      defaultValue: false,
    }),
    field.select(
      'details.minimumRentalPeriod',
      'Minimum Rental Period',
      enumOptions(MINIMUM_RENTAL_PERIOD_LABELS),
      { required: true },
    ),
    coreFields.description(),
    coreFields.price(),
    field.select(
      'details.pricePeriod',
      'Price period',
      enumOptions(PRICE_PERIOD_LABELS),
      { required: true, defaultValue: PricePeriod.PER_ANNUM },
    ),
    coreFields.negotiable(),
  ];
}
