import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, DataSource, In, Repository } from 'typeorm';
import { Paginated } from '../../../common/pagination/interfaces/paginated.interface';
import { PaginationProvider } from '../../../common/pagination/providers/pagination.provider';
import { LocationService } from '../../location/location.service';
import { pickDefined } from '../../listings/utils/pick-defined';
import { buildListingSlug } from '../../listings/utils/slug.util';
import {
  AdminLodgeQueryDto,
  LodgeManageQueryDto,
} from '../dtos/lodge-query.dto';
import { CreateLodgeDto, UpdateLodgeDto } from '../dtos/lodge.dto';
import { LodgeCardView, LodgeManageView } from '../dtos/lodge-response.dto';
import { FamilyHouse } from '../entities/family-house.entity';
import { LodgeAssemblyGate } from '../entities/lodge-assembly-gate.entity';
import { LodgeBedSlot } from '../entities/lodge-bed-slot.entity';
import { LodgeBooking } from '../entities/lodge-booking.entity';
import { LodgeImage } from '../entities/lodge-image.entity';
import { LodgePickupBatch } from '../entities/lodge-pickup-batch.entity';
import { Lodge } from '../entities/lodge.entity';
import {
  ACTIVE_BOOKING_STATUSES,
  LodgeAvailability,
  LodgeStatus,
} from '../enums/lodge.enums';
import { computeSetup } from '../mappers/lodge.mapper';
import { likeContains } from '../utils/like.util';
import { resolveOptionalLocality } from '../utils/locality.util';
import { LodgeScope } from '../utils/lodge-scope';
import { LodgeAccessService } from './lodge-access.service';
import { LodgeImageService } from './lodge-image.service';
import { LodgeViewService } from './lodge-view.service';

// lifecycle of a lodge for house admins and super admins; the scope decides whose lodges
@Injectable()
export class LodgeService {
  constructor(
    @InjectRepository(Lodge) private readonly lodges: Repository<Lodge>,
    private readonly dataSource: DataSource,
    private readonly access: LodgeAccessService,
    private readonly views: LodgeViewService,
    private readonly images: LodgeImageService,
    private readonly locations: LocationService,
    private readonly pagination: PaginationProvider,
  ) {}

  // always a draft in the caller's own house
  async create(
    house: FamilyHouse,
    dto: CreateLodgeDto,
  ): Promise<LodgeManageView> {
    const locality = resolveOptionalLocality(
      this.locations,
      dto.stateCode,
      dto.lgaName,
    );
    const lodge = await this.lodges.save(
      this.lodges.create({
        ...this.fieldsFrom(dto),
        ...locality,
        name: dto.name,
        address: dto.address,
        slug: buildListingSlug(dto.name),
        familyHouseId: house.id,
        // a lodge starts with the house's fellowship unless one is given
        fellowship: dto.fellowship ?? house.fellowship,
        status: LodgeStatus.DRAFT,
        availability: LodgeAvailability.OPEN,
      }),
    );
    return this.views.manage(lodge);
  }

  async get(scope: LodgeScope, id: string): Promise<LodgeManageView> {
    return this.views.manage(await this.access.find(id, scope));
  }

  async list(
    scope: LodgeScope,
    query: LodgeManageQueryDto | AdminLodgeQueryDto,
    baseUrl: string,
  ): Promise<Paginated<LodgeCardView>> {
    const qb = this.lodges.createQueryBuilder('lodge');

    if (scope.familyHouseId) {
      qb.where('lodge.family_house_id = :house', {
        house: scope.familyHouseId,
      });
    } else if ('familyHouseId' in query && query.familyHouseId) {
      qb.where('lodge.family_house_id = :house', {
        house: query.familyHouseId,
      });
    } else {
      qb.where('1 = 1');
    }
    if (query.status)
      qb.andWhere('lodge.status = :status', { status: query.status });
    if (query.availability) {
      qb.andWhere('lodge.availability = :availability', {
        availability: query.availability,
      });
    }
    if (query.search) {
      const term = likeContains(query.search);
      qb.andWhere(
        new Brackets((inner) =>
          inner
            .where('lodge.name ILIKE :term', { term })
            .orWhere('lodge.address ILIKE :term', { term }),
        ),
      );
    }
    qb.orderBy('lodge.createdAt', 'DESC');

    const page = await this.pagination.paginateQuery(qb, query, baseUrl);
    return { ...page, data: await this.views.cards(page.data) };
  }

  async update(
    scope: LodgeScope,
    id: string,
    dto: UpdateLodgeDto,
  ): Promise<LodgeManageView> {
    if ((dto.stateCode === undefined) !== (dto.lgaName === undefined)) {
      throw new BadRequestException(
        'stateCode and lgaName must be sent together',
      );
    }
    const locality = resolveOptionalLocality(
      this.locations,
      dto.stateCode,
      dto.lgaName,
    );

    const lodge = await this.dataSource.transaction(async (manager) => {
      const current = await this.access.find(id, scope, manager, true);
      if (
        dto.bedSlotsEnabled !== undefined &&
        dto.bedSlotsEnabled !== current.bedSlotsEnabled
      ) {
        const active = await manager.count(LodgeBooking, {
          where: { lodgeId: id, status: In([...ACTIVE_BOOKING_STATUSES]) },
        });
        if (active > 0) {
          throw new ConflictException(
            'Bed tracking cannot be switched while bookings are active',
          );
        }
      }
      // slug never changes, so shared links keep working
      Object.assign(
        current,
        pickDefined({
          ...this.fieldsFrom(dto),
          ...locality,
          name: dto.name,
          address: dto.address,
          fellowship: dto.fellowship,
        }),
      );
      return manager.save(Lodge, current);
    });
    return this.views.manage(lodge);
  }

  // draft or unpublished -> published; every setup step must be complete
  async publish(scope: LodgeScope, id: string): Promise<LodgeManageView> {
    const lodge = await this.dataSource.transaction(async (manager) => {
      const current = await this.access.find(id, scope, manager, true);
      if (current.status === LodgeStatus.PUBLISHED) {
        return current;
      }

      const house = await manager.findOne(FamilyHouse, {
        where: { id: current.familyHouseId },
      });
      if (!house?.isActive) {
        throw new ConflictException('This family house is not active');
      }

      const [photos, bedSlots, batches, gates] = await Promise.all([
        manager.count(LodgeImage, { where: { lodgeId: id } }),
        manager.count(LodgeBedSlot, { where: { lodgeId: id } }),
        manager.count(LodgePickupBatch, { where: { lodgeId: id } }),
        manager.count(LodgeAssemblyGate, { where: { lodgeId: id } }),
      ]);
      const setup = computeSetup(current, { photos, bedSlots, batches, gates });
      if (!setup.readyToPublish) {
        const missing = Object.entries(setup.steps)
          .filter(([, done]) => !done)
          .map(([step]) => step);
        throw new BadRequestException({
          statusCode: 400,
          error: 'LodgeIncomplete',
          message: `Finish these setup steps before publishing: ${missing.join(', ')}`,
          missing,
        });
      }

      current.status = LodgeStatus.PUBLISHED;
      current.publishedAt = current.publishedAt ?? new Date();
      return manager.save(current);
    });
    return this.views.manage(lodge);
  }

  async unpublish(scope: LodgeScope, id: string): Promise<LodgeManageView> {
    const lodge = await this.dataSource.transaction(async (manager) => {
      const current = await this.access.find(id, scope, manager, true);
      if (current.status === LodgeStatus.DRAFT) {
        throw new BadRequestException('A draft lodge is not published');
      }
      current.status = LodgeStatus.UNPUBLISHED;
      return manager.save(current);
    });
    return this.views.manage(lodge);
  }

  // open or closed to new bookings; "full" is derived from the beds
  async setAvailability(
    scope: LodgeScope,
    id: string,
    availability: LodgeAvailability,
  ): Promise<LodgeManageView> {
    const lodge = await this.dataSource.transaction(async (manager) => {
      const current = await this.access.find(id, scope, manager, true);
      current.availability = availability;
      return manager.save(current);
    });
    return this.views.manage(lodge);
  }

  // archive: soft delete, photos removed from storage; blocked while beds are held
  async archive(scope: LodgeScope, id: string): Promise<void> {
    let publicIds: string[] = [];

    await this.dataSource.transaction(async (manager) => {
      const lodge = await this.access.find(id, scope, manager, true);
      const active = await manager.count(LodgeBooking, {
        where: { lodgeId: id, status: In([...ACTIVE_BOOKING_STATUSES]) },
      });
      if (active > 0) {
        throw new ConflictException(
          'This lodge has active bookings. Reject or cancel them first',
        );
      }
      lodge.status = LodgeStatus.ARCHIVED;
      await manager.save(lodge);
      publicIds = await this.images.deleteAll(manager, id);
      await manager.softDelete(Lodge, { id });
    });

    await this.images.purgeFromStorage(publicIds);
  }

  // core fields shared by create and update (undefined stays undefined)
  private fieldsFrom(dto: CreateLodgeDto | UpdateLodgeDto) {
    return {
      landmark: dto.landmark,
      mapsUrl: dto.mapsUrl,
      latitude: dto.latitude,
      longitude: dto.longitude,
      coordinatorName: dto.coordinatorName,
      hotline: dto.hotline,
      whatsappNumber: dto.whatsappNumber,
      pricePerBed: dto.pricePerBed,
      inventoryMode: dto.inventoryMode,
      bedSlotsEnabled: dto.bedSlotsEnabled,
      capacity: dto.capacity,
      amenities: dto.amenities && [...new Set(dto.amenities)],
      houseRules: dto.houseRules?.map((rule) => ({
        title: rule.title,
        description: rule.description,
        enabled: rule.enabled,
        value: rule.value,
        level: rule.level,
      })),
    };
  }
}
