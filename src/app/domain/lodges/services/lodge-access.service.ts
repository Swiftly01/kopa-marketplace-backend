import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { Lodge } from '../entities/lodge.entity';
import { LodgeScope } from '../utils/lodge-scope';

// the single place that turns (lodge id, caller scope) into a lodge,
// so every manage operation is checked against the caller's family house
@Injectable()
export class LodgeAccessService {
  constructor(
    @InjectRepository(Lodge) private readonly lodges: Repository<Lodge>,
  ) {}

  // another house's lodge is a 404, not a 403, so ids are not leaked
  // lock=true (inside a transaction) serialises concurrent edits of one lodge
  async find(
    id: string,
    scope: LodgeScope,
    manager?: EntityManager,
    lock = false,
  ): Promise<Lodge> {
    const source = manager ?? this.lodges.manager;
    const lodge = await source.findOne(Lodge, {
      where:
        scope.familyHouseId === null
          ? { id }
          : { id, familyHouseId: scope.familyHouseId },
      ...(lock ? { lock: { mode: 'pessimistic_write' as const } } : {}),
    });
    if (!lodge) {
      throw new NotFoundException('Lodge not found');
    }
    return lodge;
  }
}
