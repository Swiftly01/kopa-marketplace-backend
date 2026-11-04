import { UpdateMyBookingDto } from '../dtos/lodge-booking.dto';
import { BookingStatus } from '../enums/lodge.enums';
import { LodgeBooking } from '../entities/lodge-booking.entity';

// plain columns a corper may edit
export const SCALAR_FIELDS = [
  'fullName',
  'callUpNumber',
  'whatsappPhone',
  'gender',
  'lightsOutRoutine',
  'morningRoutine',
  'luggageNote',
  'welfareNeed',
  'nextOfKinName',
  'nextOfKinRelation',
  'nextOfKinPhone',
] as const;

// links to a bed, a pickup batch and a gate, which need their own checks
export const LINK_FIELDS = [
  'bedSlotId',
  'pickupBatchId',
  'pickupGateId',
] as const;

export type ScalarField = (typeof SCALAR_FIELDS)[number];
export type EditableField = ScalarField | (typeof LINK_FIELDS)[number];
export type BookingPatch = Partial<Pick<LodgeBooking, ScalarField>>;

// only these statuses can still be edited, documents included
export const EDITABLE_STATUSES: readonly BookingStatus[] = [
  BookingStatus.PENDING,
  BookingStatus.CONFIRMED,
];

// once the exco confirms, identity and bed are fixed (the exco moves beds, or the corper rebooks)
const LOCKED_AFTER_CONFIRM: readonly EditableField[] = [
  'fullName',
  'callUpNumber',
  'gender',
  'bedSlotId',
];

// optional text a corper clears by sending null or an empty string
const CLEARABLE: readonly ScalarField[] = SCALAR_FIELDS.filter(
  (field) =>
    !['fullName', 'callUpNumber', 'whatsappPhone', 'gender'].includes(field),
);

const ALL_FIELDS: readonly EditableField[] = [...SCALAR_FIELDS, ...LINK_FIELDS];

// fields the request actually carries (undefined means untouched, null means clear)
export const sentFields = (dto: UpdateMyBookingDto): EditableField[] =>
  ALL_FIELDS.filter((field) => dto[field] !== undefined);

export const lockedFieldsSent = (
  status: BookingStatus,
  sent: readonly EditableField[],
): EditableField[] =>
  status === BookingStatus.CONFIRMED
    ? sent.filter((field) => LOCKED_AFTER_CONFIRM.includes(field))
    : [];

// the column values to write: call-up codes are upper-case, empty optional text is cleared
export const toPatch = (
  dto: UpdateMyBookingDto,
  sent: readonly EditableField[],
): BookingPatch => {
  const patch: Record<string, unknown> = {};
  for (const field of SCALAR_FIELDS) {
    if (!sent.includes(field)) continue;
    const value = dto[field];
    if (CLEARABLE.includes(field)) {
      patch[field] = value === '' ? null : value;
    } else {
      patch[field] =
        field === 'callUpNumber' ? String(value).toUpperCase() : value;
    }
  }
  return patch;
};

// which of the patched columns really differ from what is stored
export const changedScalars = (
  booking: Pick<LodgeBooking, ScalarField>,
  patch: BookingPatch,
): ScalarField[] =>
  (Object.keys(patch) as ScalarField[]).filter(
    (field) => booking[field] !== patch[field],
  );
