// each enum is paired with a Record<Enum, string> so a missing label fails compilation

export enum PropertyType {
  APARTMENT = 'apartment',
  BEDSITTER = 'bedsitter',
  BLOCK_OF_FLATS = 'block_of_flats',
  BUNGALOW = 'bungalow',
  CHALET = 'chalet',
  CONDO = 'condo',
  DUPLEX = 'duplex',
  FARM_HOUSE = 'farm_house',
  HOUSE = 'house',
  MAISONETTE = 'maisonette',
  MANSION = 'mansion',
  MINI_FLAT = 'mini_flat',
  PENTHOUSE = 'penthouse',
  ROOM_AND_PARLOUR = 'room_and_parlour',
  SHARED_APARTMENT = 'shared_apartment',
}

export const PROPERTY_TYPE_LABELS: Record<PropertyType, string> = {
  [PropertyType.APARTMENT]: 'Apartment',
  [PropertyType.BEDSITTER]: 'Bedsitter',
  [PropertyType.BLOCK_OF_FLATS]: 'Block of Flats',
  [PropertyType.BUNGALOW]: 'Bungalow',
  [PropertyType.CHALET]: 'Chalet',
  [PropertyType.CONDO]: 'Condo',
  [PropertyType.DUPLEX]: 'Duplex',
  [PropertyType.FARM_HOUSE]: 'Farm House',
  [PropertyType.HOUSE]: 'House',
  [PropertyType.MAISONETTE]: 'Maisonette',
  [PropertyType.MANSION]: 'Mansion',
  [PropertyType.MINI_FLAT]: 'Mini Flat',
  [PropertyType.PENTHOUSE]: 'Penthouse',
  [PropertyType.ROOM_AND_PARLOUR]: 'Room & Parlour',
  [PropertyType.SHARED_APARTMENT]: 'Shared Apartment',
};

export enum PropertyCondition {
  FAIRLY_USED = 'fairly_used',
  NEWLY_BUILT = 'newly_built',
  OLD = 'old',
  RENOVATED = 'renovated',
}

export const PROPERTY_CONDITION_LABELS: Record<PropertyCondition, string> = {
  [PropertyCondition.FAIRLY_USED]: 'Fairly Used',
  [PropertyCondition.NEWLY_BUILT]: 'Newly-Built',
  [PropertyCondition.OLD]: 'Old',
  [PropertyCondition.RENOVATED]: 'Renovated',
};

export enum Furnishing {
  FURNISHED = 'furnished',
  SEMI_FURNISHED = 'semi_furnished',
  UNFURNISHED = 'unfurnished',
}

export const FURNISHING_LABELS: Record<Furnishing, string> = {
  [Furnishing.FURNISHED]: 'Furnished',
  [Furnishing.SEMI_FURNISHED]: 'Semi-Furnished',
  [Furnishing.UNFURNISHED]: 'Unfurnished',
};

export enum ListedBy {
  AGENT = 'agent',
  OWNER = 'owner',
}

export const LISTED_BY_LABELS: Record<ListedBy, string> = {
  [ListedBy.AGENT]: 'Agent',
  [ListedBy.OWNER]: 'Owner',
};

// ordered as the picker shows them; the screenshot list was cut off after "Sectionals"
export enum Facility {
  APPLIANCES = 'appliances',
  BACKUP_GENERATOR = 'backup_generator',
  BBQ_AREA = 'bbq_area',
  CCTV = 'cctv',
  ELECTRICITY_BACKUP = 'electricity_backup',
  ELEVATOR = 'elevator',
  EMERGENCY_EXITS = 'emergency_exits',
  EN_SUITE_BATHROOM = 'en_suite_bathroom',
  FIREFIGHTING_EQUIPMENT = 'firefighting_equipment',
  FITTED_KITCHEN = 'fitted_kitchen',
  GYM = 'gym',
  INTERCOM = 'intercom',
  PARKING_SPACE = 'parking_space',
  POSTPAID_METER = 'postpaid_meter',
  PREPAID_METER = 'prepaid_meter',
  SECTIONALS = 'sectionals',
  SECURITY = 'security',
  SWIMMING_POOL = 'swimming_pool',
  WARDROBE = 'wardrobe',
  WATER_SUPPLY = 'water_supply',
  WIFI = 'wifi',
}

export const FACILITY_LABELS: Record<Facility, string> = {
  [Facility.APPLIANCES]: 'Appliances',
  [Facility.BACKUP_GENERATOR]: 'Backup Generator',
  [Facility.BBQ_AREA]: 'BBQ Area',
  [Facility.CCTV]: 'CCTV',
  [Facility.ELECTRICITY_BACKUP]: 'Electricity Backup',
  [Facility.ELEVATOR]: 'Elevator / Lift',
  [Facility.EMERGENCY_EXITS]: 'Emergency Exits',
  [Facility.EN_SUITE_BATHROOM]: 'En Suite Bathroom',
  [Facility.FIREFIGHTING_EQUIPMENT]: 'Firefighting Equipment',
  [Facility.FITTED_KITCHEN]: 'Fitted Kitchen',
  [Facility.GYM]: 'Gym',
  [Facility.INTERCOM]: 'Intercom',
  [Facility.PARKING_SPACE]: 'Parking Space',
  [Facility.POSTPAID_METER]: 'Postpaid Meter',
  [Facility.PREPAID_METER]: 'Prepaid Meter',
  [Facility.SECTIONALS]: 'Sectionals',
  [Facility.SECURITY]: 'Security',
  [Facility.SWIMMING_POOL]: 'Swimming Pool',
  [Facility.WARDROBE]: 'Wardrobe',
  [Facility.WATER_SUPPLY]: 'Water Supply',
  [Facility.WIFI]: 'Wi-Fi',
};

// options for this picker were not in the screenshots; adjust the list freely
export enum MinimumRentalPeriod {
  ONE_MONTH = 'one_month',
  THREE_MONTHS = 'three_months',
  SIX_MONTHS = 'six_months',
  ONE_YEAR = 'one_year',
  TWO_YEARS = 'two_years',
}

export const MINIMUM_RENTAL_PERIOD_LABELS: Record<MinimumRentalPeriod, string> =
  {
    [MinimumRentalPeriod.ONE_MONTH]: '1 Month',
    [MinimumRentalPeriod.THREE_MONTHS]: '3 Months',
    [MinimumRentalPeriod.SIX_MONTHS]: '6 Months',
    [MinimumRentalPeriod.ONE_YEAR]: '1 Year',
    [MinimumRentalPeriod.TWO_YEARS]: '2 Years',
  };

// the dropdown under the price; only "per annum" was visible in the screenshots
export enum PricePeriod {
  PER_ANNUM = 'per_annum',
  PER_MONTH = 'per_month',
  PER_WEEK = 'per_week',
  PER_DAY = 'per_day',
}

export const PRICE_PERIOD_LABELS: Record<PricePeriod, string> = {
  [PricePeriod.PER_ANNUM]: 'per annum',
  [PricePeriod.PER_MONTH]: 'per month',
  [PricePeriod.PER_WEEK]: 'per week',
  [PricePeriod.PER_DAY]: 'per day',
};
