import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Location, LocationType } from './entities/location.entity';
import { Repository } from 'typeorm';

@Injectable()
export class LocationService {
  constructor(
    @InjectRepository(Location)
    private readonly repo: Repository<Location>,
  ) {}

  async getStates(): Promise<Location[]> {
    return this.repo.find({
      where: { type: LocationType.STATE, isActive: true },
      order: { name: 'ASC' },
    });
  }

  async getLgasByState(stateSlugOrCode: string): Promise<Location[]> {
    const state = await this.repo.findOne({
      where: [
        { code: stateSlugOrCode, type: LocationType.STATE },
        { slug: stateSlugOrCode, type: LocationType.STATE },
      ],
    });

    if (!state) {
      throw new NotFoundException('State not found');
    }

    return this.repo.find({
      where: {
        parentId: state.id,
        type: LocationType.LGA,
        isActive: true,
      },
      order: { name: 'ASC' },
    });
  }

  // ---------- SEARCH ----------
  async search(query: string): Promise<Location[]> {
    if (!query) return [];

    return this.repo
      .createQueryBuilder('location')
      .where('location.name ILIKE :q', { q: `%${query}%` })
      .orWhere('location.code ILIKE :q', { q: `%${query}%` })
      .limit(20)
      .getMany();
  }

  async getByCode(code: string): Promise<Location> {
    const location = await this.repo.findOne({
      where: { code },
    });

    if (!location) {
      throw new NotFoundException('Location not found');
    }

    return location;
  }

  async getNigeriaTree() {
    const states = await this.repo.find({
      where: {
        type: LocationType.STATE,
      },
      relations: ['children'],
    });

    return states.map((state) => ({
      id: state.id,
      name: state.name,
      lgas: state.children.map((lga) => ({
        id: lga.id,
        name: lga.name,
      })),
    }));
  }
  async getAllLgaIdsByState(stateId: string): Promise<string[]> {
    const lgas = await this.repo.find({
      where: {
        parentId: stateId,
        type: LocationType.LGA,
        isActive: true,
      },
      select: ['id'],
    });

    return lgas.map((lga) => lga.id);
  }
}
