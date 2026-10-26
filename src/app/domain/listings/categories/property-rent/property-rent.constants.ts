// must match categories.code seeded by the migration for "Houses & Apartments for Rent"
export const PROPERTY_RENT_CATEGORY_CODE = 'houses_apartments_for_rent';

// bump when the form changes in a way clients should notice
export const PROPERTY_RENT_FORM_VERSION = 1;

export const ADDRESS_MAX_LENGTH = 60;
export const ESTATE_NAME_MAX_LENGTH = 60;
export const PROPERTY_SIZE_MAX_LENGTH = 30;

// pickers: the screenshots list bedrooms/bathrooms up to at least 14, toilets up to 10
export const MAX_BEDROOMS = 20;
export const MAX_BATHROOMS = 20;
export const MAX_TOILETS = 10;

// "Popular" section of the bedroom and bathroom pickers, in display order
export const POPULAR_BEDROOMS = [2, 3, 1, 4, 5] as const;
export const POPULAR_BATHROOMS = [3, 4, 2, 1, 5] as const;
