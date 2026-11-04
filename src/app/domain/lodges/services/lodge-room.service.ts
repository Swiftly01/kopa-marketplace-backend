import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, In, Repository } from 'typeorm';
import { pickDefined } from '../../listings/utils/pick-defined';
import { CreateRoomDto, UpdateRoomDto } from '../dtos/lodge-inventory.dto';
import { RoomView } from '../dtos/lodge-ops-response.dto';
import { LodgeBedSlot } from '../entities/lodge-bed-slot.entity';
import { LodgeBooking } from '../entities/lodge-booking.entity';
import { LodgeRoom } from '../entities/lodge-room.entity';
import { ACTIVE_BOOKING_STATUSES, BedSlotStatus, RoomKind } from '../enums/lodge.enums';
import { toRoomView } from '../mappers/lodge.mapper';
import { LodgeScope } from '../utils/lodge-scope';
import { LodgeAccessService } from './lodge-access.service';

const MAX_ROOMS = 100;
const pad = (value: number) => String(value).padStart(2, '0');

// rooms and partitions that group bed slots (R01, R02 ...)
@Injectable()
export class LodgeRoomService {
  constructor(
    @InjectRepository(LodgeRoom) private readonly rooms: Repository<LodgeRoom>,
    private readonly dataSource: DataSource,
    private readonly access: LodgeAccessService,
  ) {}

  async list(scope: LodgeScope, lodgeId: string): Promise<RoomView[]> {
    await this.access.find(lodgeId, scope);
    return this.listRaw(lodgeId);
  }

  async create(
    scope: LodgeScope,
    lodgeId: string,
    dto: CreateRoomDto,
  ): Promise<RoomView[]> {
    await this.dataSource.transaction(async (manager) => {
      await this.access.find(lodgeId, scope, manager, true);
      const existing = await manager.find(LodgeRoom, { where: { lodgeId } });
      if (existing.length >= MAX_ROOMS) {
        throw new ConflictException(`A lodge can have at most ${MAX_ROOMS} rooms`);
      }
      // continue after the highest code so deleted rooms never cause a clash
      const highest = existing.reduce(
        (max, room) => Math.max(max, Number(room.code.slice(1)) || 0),
        0,
      );
      await manager.save(
        manager.create(LodgeRoom, {
          lodgeId,
          code: `R${pad(highest + 1)}`,
          name: dto.name,
          description: dto.description ?? null,
          kind: dto.kind ?? RoomKind.SHARED,
          wing: dto.wing ?? null,
          features: dto.features ?? [],
          rentContribution: dto.rentContribution ?? null,
          position: existing.length,
        }),
      );
    });
    return this.listRaw(lodgeId);
  }

  async update(
    scope: LodgeScope,
    lodgeId: string,
    roomId: string,
    dto: UpdateRoomDto,
  ): Promise<RoomView[]> {
    await this.dataSource.transaction(async (manager) => {
      await this.access.find(lodgeId, scope, manager, true);
      const room = await this.findRoom(manager, lodgeId, roomId);
      Object.assign(room, pickDefined(dto));
      await manager.save(room);
    });
    return this.listRaw(lodgeId);
  }

  // beds of a removed room stay in the lodge, just outside any room
  async remove(
    scope: LodgeScope,
    lodgeId: string,
    roomId: string,
  ): Promise<RoomView[]> {
    await this.dataSource.transaction(async (manager) => {
      await this.access.find(lodgeId, scope, manager, true);
      const room = await this.findRoom(manager, lodgeId, roomId);

      const slots = await manager.find(LodgeBedSlot, {
        where: { roomId: room.id },
        select: { id: true, status: true },
      });
      const busy = slots.some((slot) => slot.status !== BedSlotStatus.AVAILABLE);
      const booked =
        slots.length > 0 &&
        (await manager.count(LodgeBooking, {
          where: {
            bedSlotId: In(slots.map((slot) => slot.id)),
            status: In([...ACTIVE_BOOKING_STATUSES]),
          },
        })) > 0;
      if (busy || booked) {
        throw new ConflictException(
          'This room has occupied, reserved or held beds. Move or release them first',
        );
      }
      await manager.delete(LodgeRoom, { id: room.id });

      const rest = await manager.find(LodgeRoom, {
        where: { lodgeId },
        order: { position: 'ASC', createdAt: 'ASC' },
      });
      rest.forEach((item, index) => (item.position = index));
      await manager.save(rest);
    });
    return this.listRaw(lodgeId);
  }

  private async listRaw(lodgeId: string): Promise<RoomView[]> {
    const rooms = await this.rooms.find({
      where: { lodgeId },
      order: { position: 'ASC' },
    });
    return rooms.map(toRoomView);
  }

  private async findRoom(
    manager: EntityManager,
    lodgeId: string,
    roomId: string,
  ): Promise<LodgeRoom> {
    const room = await manager.findOne(LodgeRoom, {
      where: { id: roomId, lodgeId },
    });
    if (!room) {
      throw new NotFoundException('Room not found');
    }
    return room;
  }
}
