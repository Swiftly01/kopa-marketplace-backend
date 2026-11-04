import { ConflictException } from '@nestjs/common';

interface PgError {
  code?: string;
  constraint?: string;
}

// unique index hits become clear 409s instead of a raw database error
export const translateBookingConflict = (error: unknown): unknown => {
  const pg = error as PgError;
  if (pg?.code !== '23505') return error;
  if (pg.constraint === 'UQ_lodge_bookings_active_corper') {
    return new ConflictException(
      'You already have an active lodge booking. Cancel it before applying elsewhere',
    );
  }
  if (pg.constraint === 'UQ_lodge_bookings_active_bed') {
    return new ConflictException(
      'This bed is no longer available. Pick another one',
    );
  }
  return new ConflictException(
    'Passcode already used. Refresh the code and try again',
  );
};
