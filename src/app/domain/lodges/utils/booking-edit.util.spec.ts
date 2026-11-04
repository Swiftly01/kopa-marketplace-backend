import { BookingStatus } from '../enums/lodge.enums';
import {
  changedScalars,
  lockedFieldsSent,
  sentFields,
  toPatch,
} from './booking-edit.util';

describe('booking edit helpers', () => {
  it('treats undefined as untouched and null as a clear', () => {
    const dto = { welfareNeed: null, fullName: undefined, bedSlotId: 'x' };
    expect(sentFields(dto as never)).toEqual(['welfareNeed', 'bedSlotId']);
  });

  it('locks identity and bed once confirmed, nothing while pending', () => {
    const sent = ['fullName', 'whatsappPhone', 'bedSlotId'] as const;
    expect(lockedFieldsSent(BookingStatus.CONFIRMED, sent)).toEqual(['fullName', 'bedSlotId']);
    expect(lockedFieldsSent(BookingStatus.PENDING, sent)).toEqual([]);
  });

  it('upper-cases the call-up number and clears empty optional text', () => {
    const dto = { callUpNumber: 'os/26a/0123', luggageNote: '', nextOfKinPhone: null };
    const patch = toPatch(dto as never, ['callUpNumber', 'luggageNote', 'nextOfKinPhone']);
    expect(patch).toEqual({ callUpNumber: 'OS/26A/0123', luggageNote: null, nextOfKinPhone: null });
  });

  it('reports only columns that really differ', () => {
    const booking = { fullName: 'A B', luggageNote: null } as never;
    expect(changedScalars(booking, { fullName: 'A B', luggageNote: '2 Boxes' })).toEqual(['luggageNote']);
  });
});
