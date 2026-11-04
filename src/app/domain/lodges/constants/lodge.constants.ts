export const MIN_LODGE_PHOTOS_TO_PUBLISH = 5;
export const MAX_LODGE_PHOTOS = 8;
export const MAX_LODGE_BED_SLOTS = 500;
export const MAX_PICKUP_BATCHES = 10;

// NYSC documents: posting letter (PDF), camp ID / passport photo (JPG, PNG)
export const BOOKING_DOCUMENT_FORMATS = ['pdf', 'jpg', 'jpeg', 'png'] as const;
export const MAX_BOOKING_DOCUMENT_MB = 5;
export const MAX_BOOKING_DOCUMENT_BYTES = MAX_BOOKING_DOCUMENT_MB * 1024 * 1024;
export const MAX_BOOKING_DOCUMENTS = 3;

export const PASSCODE_TTL_MS = 30 * 60 * 1000;
export const PASSCODE_PATTERN = /^CL-[A-Z0-9]{3}-\d{4}-\d{4}[A-Z]$/;

export const LODGE_CLOUDINARY_ROOT = 'kopamart/lodges';
export const LODGE_BOOKING_CLOUDINARY_ROOT = 'kopamart/lodge-bookings';

// quick-pick amenities from wizard step 4A; custom ones are allowed too
export const AMENITY_PRESETS = [
  {
    code: 'solar_inverter_power',
    label: '24/7 Solar Inverter Power',
    description:
      'Steady lighting & device charging during public grid outages.',
  },
  {
    code: 'borehole_water',
    label: 'Piped Borehole Water & Pump',
    description:
      'Motorized running water to all dormitory bathrooms & kitchen.',
  },
  {
    code: 'shared_kitchen_gas',
    label: 'Shared Kitchen & Gas Cylinder',
    description: 'Cooking gas replenished periodically by lodge welfare exco.',
  },
  {
    code: 'bunk_beds_foam',
    label: 'Bunk Beds & Foam Mattresses',
    description: 'High-density foam mattress provided per allocated bed slot.',
  },
  {
    code: 'study_library',
    label: 'Study / Silent Library Space',
    description: 'Dedicated quiet room for CDS prep, study, and CDS projects.',
  },
  {
    code: 'fenced_compound_guard',
    label: 'Fenced Compound & Night Guard',
    description: 'Full perimeter fence, gated compound, and security presence.',
  },
  {
    code: 'starlink_wifi',
    label: 'Starlink High-Speed Wi-Fi',
    description:
      'Uncapped satellite broadband access for all registered corpers.',
  },
  {
    code: 'standby_generator',
    label: 'Standby Generator Backup',
    description: 'Heavier load support for water pumping & clothes pressing.',
  },
  {
    code: 'laundry_area',
    label: 'Laundry Area & Drying Lines',
    description:
      'Covered wash area with ample clothes lines in the back compound.',
  },
] as const;
