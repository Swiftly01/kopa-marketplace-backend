import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, In, Repository } from 'typeorm';
import { LodgeAssemblyGate } from '../entities/lodge-assembly-gate.entity';
import { LodgeBooking } from '../entities/lodge-booking.entity';
import { LodgePickupBatch } from '../entities/lodge-pickup-batch.entity';
import { ACTIVE_BOOKING_STATUSES, BatchStatus } from '../enums/lodge.enums';
import { EDITABLE_STATUSES } from '../utils/booking-edit.util';

// business rules shared by booking, editing and the passcode step
@Injectable()
export class LodgeBookingRulesService {
  constructor(
    @InjectRepository(LodgeBooking)
    private readonly bookings: Repository<LodgeBooking>,
  ) {}

  // a corper holds one booking at a time across every house and lodge
  async assertNoActiveBooking(corperId: string, manager?: EntityManager): Promise<void> {
    const repo = manager ? manager.getRepository(LodgeBooking) : this.bookings;
    const holding = await repo.count({
      where: { corperId, status: In([...ACTIVE_BOOKING_STATUSES]) },
    });
    if (holding > 0) {
      throw new ConflictException(
        'You already have an active lodge booking. Cancel it before applying elsewhere',
      );
    }
  }

  // checks the gate and takes a seat check on the batch; null or undefined skips that part
  async claimPickup(
    manager: EntityManager,
    lodgeId: string,
    pick: { batchId?: string | null; gateId?: string | null },
  ): Promise<void> {
    if (pick.gateId) {
      const gate = await manager.findOne(LodgeAssemblyGate, {
        where: { id: pick.gateId, lodgeId },
      });
      if (!gate) {
        throw new NotFoundException('Assembly gate not found');
      }
    }
    if (!pick.batchId) return;

    const batch = await manager.findOne(LodgePickupBatch, {
      where: { id: pick.batchId, lodgeId },
      lock: { mode: 'pessimistic_write' },
    });
    if (!batch) {
      throw new NotFoundException('Pickup batch not found');
    }
    if (batch.status === BatchStatus.CANCELLED || batch.status === BatchStatus.COMPLETED) {
      throw new ConflictException('This pickup batch is no longer running');
    }
    const booked = await manager.count(LodgeBooking, {
      where: {
        pickupBatchId: batch.id,
        status: In([...ACTIVE_BOOKING_STATUSES]),
      },
    });
    if (booked >= batch.capacity) {
      throw new ConflictException('This pickup batch is full. Pick another one');
    }
  }

  // locks the corper's own booking and makes sure it can still be changed
  async lockEditable(
    manager: EntityManager,
    corperId: string,
    id: string,
  ): Promise<LodgeBooking> {
    const booking = await manager.findOne(LodgeBooking, {
      where: { id, corperId },
      lock: { mode: 'pessimistic_write' },
    });
    if (!booking) {
      throw new NotFoundException('Booking not found');
    }
    if (!EDITABLE_STATUSES.includes(booking.status)) {
      throw new ConflictException(`A ${booking.status} booking can no longer be edited`);
    }
    return booking;
  }
}
