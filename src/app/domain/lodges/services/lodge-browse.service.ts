import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';
import { Paginated } from '../../../common/pagination/interfaces/paginated.interface';
import { PaginationProvider } from '../../../common/pagination/providers/pagination.provider';
import { CorperLodgeQueryDto } from '../dtos/lodge-query.dto';
import {
  BedSlotView,
  LodgeCardView,
  LodgeDetailView,
} from '../dtos/lodge-response.dto';
import { Lodge } from '../entities/lodge.entity';
import {
  ACTIVE_BOOKING_STATUSES,
  BedSlotStatus,
  CorperGender,
  LodgeAvailability,
  LodgeStatus,
  WING_BY_GENDER,
} from '../enums/lodge.enums';
import { likeContains } from '../utils/like.util';
import { LodgeBedSlotService } from './lodge-bed-slot.service';
import { LodgeBookingRulesService } from './lodge-booking-rules.service';
import { LodgePasscodeService } from './lodge-passcode.service';
import { LodgeViewService } from './lodge-view.service';

// corper-facing reads: only published lodges of active houses ever leave this service
@Injectable()
export class LodgeBrowseService {
  constructor(
    @InjectRepository(Lodge) private readonly lodges: Repository<Lodge>,
    private readonly views: LodgeViewService,
    private readonly bedSlots: LodgeBedSlotService,
    private readonly passcodes: LodgePasscodeService,
    private readonly rules: LodgeBookingRulesService,
    private readonly pagination: PaginationProvider,
  ) {}

  // published, open lodges that still have a free bed (in the right wing when gender is given)
  async search(
    query: CorperLodgeQueryDto,
    baseUrl: string,
  ): Promise<Paginated<LodgeCardView>> {
    const qb = this.lodges
      .createQueryBuilder('lodge')
      .innerJoin('lodge.familyHouse', 'house', 'house.is_active = true')
      .where('lodge.status = :status', { status: LodgeStatus.PUBLISHED })
      .andWhere('lodge.availability = :availability', {
        availability: LodgeAvailability.OPEN,
      });

    // room = a free bed (right wing when gender is given), or spots left under
    // the cap for lodges that do not track beds
    const wing = query.gender ? WING_BY_GENDER[query.gender] : null;
    qb.andWhere(
      `(EXISTS (SELECT 1 FROM lodge_bed_slots slot WHERE slot.lodge_id = lodge.id AND slot.status = :free${wing ? ' AND slot.wing = :wing' : ''})
        OR (lodge.bed_slots_enabled = false AND (lodge.capacity IS NULL OR lodge.capacity > (SELECT COUNT(*) FROM lodge_bookings held WHERE held.lodge_id = lodge.id AND held.status IN (:...held)))))`,
      {
        free: BedSlotStatus.AVAILABLE,
        held: [...ACTIVE_BOOKING_STATUSES],
        ...(wing ? { wing } : {}),
      },
    );

    if (query.stateCode) {
      qb.andWhere('lodge.state_code = :stateCode', {
        stateCode: query.stateCode.toUpperCase(),
      });
    }
    if (query.lgaName) {
      qb.andWhere('lodge.lga_name ILIKE :lga', { lga: query.lgaName.trim() });
    }
    if (query.fellowship) {
      qb.andWhere('lodge.fellowship ILIKE :fellowship', {
        fellowship: likeContains(query.fellowship),
      });
    }
    if (query.amenities?.length) {
      qb.andWhere('lodge.amenities @> CAST(:amenities AS text[])', {
        amenities: query.amenities,
      });
    }
    if (query.maxPrice !== undefined) {
      qb.andWhere(
        '(lodge.price_per_bed IS NULL OR lodge.price_per_bed <= :maxPrice)',
        { maxPrice: query.maxPrice },
      );
    }
    if (query.hasPickup) {
      qb.andWhere('lodge.pickup_enabled = true');
    }
    if (query.search) {
      const term = likeContains(query.search);
      qb.andWhere(
        new Brackets((inner) =>
          inner
            .where('lodge.name ILIKE :term', { term })
            .orWhere('lodge.address ILIKE :term', { term })
            .orWhere('lodge.landmark ILIKE :term', { term }),
        ),
      );
    }
    qb.orderBy('lodge.publishedAt', 'DESC');

    const page = await this.pagination.paginateQuery(qb, query, baseUrl);
    return { ...page, data: await this.views.cards(page.data) };
  }

  async getById(id: string): Promise<LodgeDetailView> {
    return this.views.detail(await this.findLive({ id }));
  }

  async getBySlug(slug: string): Promise<LodgeDetailView> {
    return this.views.detail(await this.findLive({ slug }));
  }

  // free beds for step 2; a closed lodge offers none
  async availableBeds(
    id: string,
    gender?: CorperGender,
  ): Promise<BedSlotView[]> {
    const lodge = await this.findLive({ id });
    if (
      !lodge.bedSlotsEnabled ||
      lodge.availability !== LodgeAvailability.OPEN
    ) {
      return [];
    }
    return this.bedSlots.listAvailable(
      id,
      gender ? WING_BY_GENDER[gender] : undefined,
    );
  }

  // step 4: the signed admission passcode shown before the corper submits
  async previewPasscode(userId: string, id: string) {
    // no point issuing a code to someone who already holds a booking
    await this.rules.assertNoActiveBooking(userId);
    const lodge = await this.findLive({ id });
    return this.passcodes.issue(userId, lodge);
  }

  private async findLive(
    where: { id: string } | { slug: string },
  ): Promise<Lodge> {
    const lodge = await this.lodges.findOne({
      where: { ...where, status: LodgeStatus.PUBLISHED },
      relations: { familyHouse: true },
    });
    if (!lodge || !lodge.familyHouse.isActive) {
      throw new NotFoundException('Lodge not found');
    }
    return lodge;
  }
}
