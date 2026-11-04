import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, In, Repository } from 'typeorm';
import { pickDefined } from '../../listings/utils/pick-defined';
import { MAX_PICKUP_BATCHES } from '../constants/lodge.constants';
import {
  CreateGateDto,
  UpdateGateDto,
} from '../dtos/lodge-logistics.dto';
import {
  GateView,
  LodgeManageView,
  PickupBatchView,
} from '../dtos/lodge-response.dto';
import {
  CreatePickupBatchDto,
  UpdatePickupBatchDto,
  UpdatePickupDto,
} from '../dtos/lodge-setup.dto';
import { LodgeAssemblyGate } from '../entities/lodge-assembly-gate.entity';
import { LodgeBooking } from '../entities/lodge-booking.entity';
import { LodgePickupBatch } from '../entities/lodge-pickup-batch.entity';
import { Lodge } from '../entities/lodge.entity';
import {
  ACTIVE_BOOKING_STATUSES,
  BatchStatus,
  TransitStatus,
} from '../enums/lodge.enums';
import { toGateView } from '../mappers/lodge.mapper';
import { LodgeScope } from '../utils/lodge-scope';
import { LodgeAccessService } from './lodge-access.service';
import { LodgeViewService } from './lodge-view.service';

// allowed moves of a shuttle trip
const NEXT_STATUS: Record<BatchStatus, BatchStatus[]> = {
  [BatchStatus.SCHEDULED]: [BatchStatus.BOARDING, BatchStatus.CANCELLED],
  [BatchStatus.BOARDING]: [
    BatchStatus.SCHEDULED,
    BatchStatus.IN_TRANSIT,
    BatchStatus.CANCELLED,
  ],
  [BatchStatus.IN_TRANSIT]: [BatchStatus.COMPLETED],
  [BatchStatus.COMPLETED]: [],
  [BatchStatus.CANCELLED]: [],
};

// camp pickup: bus settings, assembly gates and the shuttle trips
@Injectable()
export class LodgePickupService {
  constructor(
    @InjectRepository(LodgeAssemblyGate)
    private readonly gates: Repository<LodgeAssemblyGate>,
    private readonly dataSource: DataSource,
    private readonly access: LodgeAccessService,
    private readonly views: LodgeViewService,
  ) {}

  async updateSettings(
    scope: LodgeScope,
    lodgeId: string,
    dto: UpdatePickupDto,
  ): Promise<LodgeManageView> {
    const lodge = await this.dataSource.transaction(async (manager) => {
      const current = await this.access.find(lodgeId, scope, manager, true);
      const { transitInfo, ...rest } = dto;
      Object.assign(current, pickDefined(rest));
      if (transitInfo) {
        // corridor notes merge, so a partial update keeps the other notes
        current.transitInfo = { ...current.transitInfo, ...pickDefined(transitInfo) };
      }
      return manager.save(Lodge, current);
    });
    return this.views.manage(lodge);
  }

  // ---- assembly gates ----

  async listGates(scope: LodgeScope, lodgeId: string): Promise<GateView[]> {
    await this.access.find(lodgeId, scope);
    return this.gateViews(lodgeId);
  }

  async createGate(
    scope: LodgeScope,
    lodgeId: string,
    dto: CreateGateDto,
  ): Promise<GateView[]> {
    await this.dataSource.transaction(async (manager) => {
      await this.access.find(lodgeId, scope, manager, true);
      const count = await manager.count(LodgeAssemblyGate, { where: { lodgeId } });
      if (count >= 10) {
        throw new BadRequestException('A lodge can have at most 10 assembly gates');
      }
      await manager.save(
        manager.create(LodgeAssemblyGate, {
          lodgeId,
          name: dto.name,
          description: dto.description ?? null,
          marshalName: dto.marshalName ?? null,
          marshalPhone: dto.marshalPhone ?? null,
          position: count,
        }),
      );
    });
    return this.gateViews(lodgeId);
  }

  async updateGate(
    scope: LodgeScope,
    lodgeId: string,
    gateId: string,
    dto: UpdateGateDto,
  ): Promise<GateView[]> {
    await this.dataSource.transaction(async (manager) => {
      await this.access.find(lodgeId, scope, manager, true);
      const gate = await this.findGate(manager, lodgeId, gateId);
      Object.assign(gate, pickDefined(dto));
      await manager.save(gate);
    });
    return this.gateViews(lodgeId);
  }

  async removeGate(
    scope: LodgeScope,
    lodgeId: string,
    gateId: string,
  ): Promise<GateView[]> {
    await this.dataSource.transaction(async (manager) => {
      await this.access.find(lodgeId, scope, manager, true);
      const gate = await this.findGate(manager, lodgeId, gateId);
      const used = await manager.count(LodgeBooking, {
        where: {
          pickupGateId: gate.id,
          status: In([...ACTIVE_BOOKING_STATUSES]),
        },
      });
      if (used > 0) {
        throw new ConflictException('Corpers are assigned to this gate');
      }
      await manager.delete(LodgeAssemblyGate, { id: gate.id });

      // keep positions contiguous so position 0 stays the primary gate
      const rest = await manager.find(LodgeAssemblyGate, {
        where: { lodgeId },
        order: { position: 'ASC', createdAt: 'ASC' },
      });
      rest.forEach((item, index) => (item.position = index));
      await manager.save(rest);
    });
    return this.gateViews(lodgeId);
  }

  // ---- shuttle trips ----

  async list(scope: LodgeScope, lodgeId: string): Promise<PickupBatchView[]> {
    await this.access.find(lodgeId, scope);
    return this.views.batchViews(lodgeId);
  }

  async createBatch(
    scope: LodgeScope,
    lodgeId: string,
    dto: CreatePickupBatchDto,
  ): Promise<PickupBatchView[]> {
    this.assertWindow(dto.startTime, dto.endTime);
    await this.dataSource.transaction(async (manager) => {
      await this.access.find(lodgeId, scope, manager, true);
      if (dto.gateId) await this.findGate(manager, lodgeId, dto.gateId);
      const count = await manager.count(LodgePickupBatch, { where: { lodgeId } });
      if (count >= MAX_PICKUP_BATCHES) {
        throw new BadRequestException(
          `A lodge can have at most ${MAX_PICKUP_BATCHES} pickup batches`,
        );
      }
      await manager.save(
        manager.create(LodgePickupBatch, {
          lodgeId,
          label: dto.label,
          startTime: dto.startTime,
          endTime: dto.endTime,
          capacity: dto.capacity,
          gateId: dto.gateId ?? null,
          vehicleName: dto.vehicleName ?? null,
          driverName: dto.driverName ?? null,
          driverPhone: dto.driverPhone ?? null,
          tripMinutes: dto.tripMinutes ?? null,
          vehicleNote: dto.vehicleNote ?? null,
          status: BatchStatus.SCHEDULED,
          position: count,
        }),
      );
    });
    return this.views.batchViews(lodgeId);
  }

  async updateBatch(
    scope: LodgeScope,
    lodgeId: string,
    batchId: string,
    dto: UpdatePickupBatchDto,
  ): Promise<PickupBatchView[]> {
    await this.dataSource.transaction(async (manager) => {
      await this.access.find(lodgeId, scope, manager, true);
      const batch = await this.findBatch(manager, lodgeId, batchId);

      this.assertWindow(
        dto.startTime ?? batch.startTime,
        dto.endTime ?? batch.endTime,
      );
      if (dto.gateId) await this.findGate(manager, lodgeId, dto.gateId);
      if (dto.capacity !== undefined) {
        const booked = await this.seatsBooked(manager, batch.id);
        if (dto.capacity < booked) {
          throw new BadRequestException(
            `${booked} seats are already booked, capacity cannot go below that`,
          );
        }
      }
      Object.assign(batch, pickDefined(dto));
      await manager.save(batch);
    });
    return this.views.batchViews(lodgeId);
  }

  // dispatcher buttons: start boarding, depart, arrive, cancel
  async setBatchStatus(
    scope: LodgeScope,
    lodgeId: string,
    batchId: string,
    next: BatchStatus,
  ): Promise<PickupBatchView[]> {
    await this.dataSource.transaction(async (manager) => {
      await this.access.find(lodgeId, scope, manager, true);
      const batch = await this.findBatch(manager, lodgeId, batchId);
      if (!NEXT_STATUS[batch.status].includes(next)) {
        throw new ConflictException(
          `A ${batch.status} trip cannot move to ${next}`,
        );
      }

      if (next === BatchStatus.CANCELLED) {
        const boarded = await manager.count(LodgeBooking, {
          where: { pickupBatchId: batch.id, transitStatus: TransitStatus.BOARDED },
        });
        if (boarded > 0) {
          throw new ConflictException('Corpers are already on board this trip');
        }
      }
      if (next === BatchStatus.IN_TRANSIT) batch.departedAt = new Date();
      if (next === BatchStatus.COMPLETED) {
        batch.arrivedAt = new Date();
        // everyone still on board has reached the lodge
        await manager.update(
          LodgeBooking,
          { pickupBatchId: batch.id, transitStatus: TransitStatus.BOARDED },
          { transitStatus: TransitStatus.ARRIVED, arrivedAt: batch.arrivedAt },
        );
      }
      batch.status = next;
      await manager.save(batch);
    });
    return this.views.batchViews(lodgeId);
  }

  async removeBatch(
    scope: LodgeScope,
    lodgeId: string,
    batchId: string,
  ): Promise<PickupBatchView[]> {
    await this.dataSource.transaction(async (manager) => {
      await this.access.find(lodgeId, scope, manager, true);
      const batch = await this.findBatch(manager, lodgeId, batchId);
      if ((await this.seatsBooked(manager, batch.id)) > 0) {
        throw new ConflictException('This batch has active bookings');
      }
      await manager.delete(LodgePickupBatch, { id: batch.id });

      // keep positions contiguous
      const rest = await manager.find(LodgePickupBatch, {
        where: { lodgeId },
        order: { position: 'ASC', createdAt: 'ASC' },
      });
      rest.forEach((item, index) => (item.position = index));
      await manager.save(rest);
    });
    return this.views.batchViews(lodgeId);
  }

  private async gateViews(lodgeId: string): Promise<GateView[]> {
    const gates = await this.gates.find({
      where: { lodgeId },
      order: { position: 'ASC' },
    });
    return gates.map(toGateView);
  }

  private assertWindow(startTime: string, endTime: string): void {
    // HH:mm strings compare correctly as text
    if (endTime <= startTime) {
      throw new BadRequestException('endTime must be after startTime');
    }
  }

  private async findGate(
    manager: EntityManager,
    lodgeId: string,
    gateId: string,
  ): Promise<LodgeAssemblyGate> {
    const gate = await manager.findOne(LodgeAssemblyGate, {
      where: { id: gateId, lodgeId },
    });
    if (!gate) {
      throw new NotFoundException('Assembly gate not found');
    }
    return gate;
  }

  private async findBatch(
    manager: EntityManager,
    lodgeId: string,
    batchId: string,
  ): Promise<LodgePickupBatch> {
    const batch = await manager.findOne(LodgePickupBatch, {
      where: { id: batchId, lodgeId },
    });
    if (!batch) {
      throw new NotFoundException('Pickup batch not found');
    }
    return batch;
  }

  private seatsBooked(manager: EntityManager, batchId: string): Promise<number> {
    return manager.count(LodgeBooking, {
      where: {
        pickupBatchId: batchId,
        status: In([...ACTIVE_BOOKING_STATUSES]),
      },
    });
  }
}
