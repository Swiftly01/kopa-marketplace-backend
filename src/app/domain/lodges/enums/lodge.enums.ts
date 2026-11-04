export enum LodgeStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  UNPUBLISHED = 'unpublished',
  ARCHIVED = 'archived',
}

// set by the exco; "full" is derived from the bed slots, never stored
export enum LodgeAvailability {
  OPEN = 'open',
  CLOSED = 'closed',
}

export enum BedWing {
  MALE = 'male',
  FEMALE = 'female',
}

export enum BunkType {
  LOWER = 'lower',
  UPPER = 'upper',
}

export enum BedSlotStatus {
  AVAILABLE = 'available',
  IN_TRANSIT = 'in_transit',
  OCCUPIED = 'occupied',
  // protected hold: maintenance or exco use, never offered to corpers
  HELD = 'held',
}

export enum CorperGender {
  MALE = 'male',
  FEMALE = 'female',
}

export enum BookingStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  CHECKED_IN = 'checked_in',
  REJECTED = 'rejected',
  CANCELLED = 'cancelled',
}

// bookings that still hold a bed
export const ACTIVE_BOOKING_STATUSES: readonly BookingStatus[] = [
  BookingStatus.PENDING,
  BookingStatus.CONFIRMED,
  BookingStatus.CHECKED_IN,
];

export enum HouseRuleLevel {
  ENCOURAGED = 'encouraged',
  STRICT = 'strict',
  INFO = 'info',
}

export const WING_BY_GENDER: Record<CorperGender, BedWing> = {
  [CorperGender.MALE]: BedWing.MALE,
  [CorperGender.FEMALE]: BedWing.FEMALE,
};

// prefix used in bed slot codes: M-01, F-01
export const WING_CODE_PREFIX: Record<BedWing, string> = {
  [BedWing.MALE]: 'M',
  [BedWing.FEMALE]: 'F',
};

// how the lodge allocates space: bunks only, rooms with beds, or a mix with flexible post-arrival mapping
export enum InventoryMode {
  DORM_BUNK = 'dorm_bunk',
  ROOM_BASED = 'room_based',
  HYBRID = 'hybrid',
}

export enum RoomKind {
  SHARED = 'shared',
  SELF_CONTAINED = 'self_contained',
  EXCO = 'exco',
  GUEST = 'guest',
}

export enum BatchStatus {
  SCHEDULED = 'scheduled',
  BOARDING = 'boarding',
  IN_TRANSIT = 'in_transit',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

// per-corper progress from camp to lodge
export enum TransitStatus {
  AWAITING = 'awaiting',
  AT_GATE = 'at_gate',
  BOARDED = 'boarded',
  ARRIVED = 'arrived',
}

export enum BookingSource {
  SELF = 'self',
  MANUAL = 'manual',
}

export enum DocumentsStatus {
  MISSING = 'missing',
  PENDING = 'pending',
  VERIFIED = 'verified',
}

export enum FamilyHouseApplicationStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}
