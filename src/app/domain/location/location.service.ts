import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Location, LocationType } from './entities/location.entity';
import { Repository } from 'typeorm';
import { getLGAs, getNigeriaStates, StateCodes } from 'geo-ng';

@Injectable()
export class LocationService {
  private readonly logger = new Logger(LocationService.name);
  private readonly states = getNigeriaStates();
  constructor(
    @InjectRepository(Location)
    private readonly repo: Repository<Location>,
  ) {}

  getAllStates() {
    try {
      return {
        success: true,
        message: 'States retrived successfully',
        data: this.states.map((state) => {
          return {
            id: state.code,
            name: state.name,
            code: state.code,
          };
        }),
      };
    } catch (error) {
      if (error instanceof Error) {
        this.logger.log(`Failed to fetch states: ${error.message}`);
        throw error;
      }
      this.logger.log(`Unknown error: ${error}`);
      throw error;
    }
  }
  getLGAsByState(stateCode: string) {
    try {
      const code = stateCode.toUpperCase();
      const state = this.states.find((s) => s.code === code);

      if (!state) {
        throw new NotFoundException(`State with code "${stateCode}" not found`);
      }

      const lgas = getLGAs(code as StateCodes);

      return {
        success: true,
        message: `LGAs for ${state?.name} retrieved successfully`,
        data: {
          state: {
            code: state.code,
            name: state.name,
          },
          lgas: lgas.map((lga) => ({
            id: `${stateCode.toUpperCase()}-${lga.replace(/\s/g, '-').toLowerCase()}`,
            name: lga,
            stateCode: stateCode.toUpperCase(),
          })),
          total: lgas.length,
        },
      };
    } catch (error) {
      const err = error as Error;
      this.logger.error(
        `Failed to fetch LGAs for state ${stateCode}: ${err.message}`,
        err.stack,
      );
      throw error;
    }
  }

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
        parent: { id: state.id },
        type: LocationType.LGA,
        isActive: true,
      },
      order: { name: 'ASC' },
    });
  }

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
