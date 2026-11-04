import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, In, IsNull, Repository } from 'typeorm';
import { CloudinaryUploadResult } from '../../../cloudinary/interfaces/cloudinary-upload-result';
import { Paginated } from '../../../common/pagination/interfaces/paginated.interface';
import { PaginationProvider } from '../../../common/pagination/providers/pagination.provider';
import {
  BookingDetailsDto,
  CreateBookingDto,
  ManualBookingDto,
} from '../dtos/lodge-booking.dto';
import {
  BookingManageQueryDto,
  MyBookingsQueryDto,
} from '../dtos/lodge-query.dto';
import { BookingView } from '../dtos/lodge-response.dto';
import { FamilyHouse } from '../entities/family-house.entity';
import { LodgeBedSlot } from '../entities/lodge-bed-slot.entity';
import { LodgeBookingDocument } from '../entities/lodge-booking-document.entity';
import { LodgeBooking } from '../entities/lodge-booking.entity';
import { Lodge } from '../entities/lodge.entity';
import {
  ACTIVE_BOOKING_STATUSES,
  BedSlotStatus,
  BookingSource,
  BookingStatus,
  InventoryMode,
  LodgeAvailability,
  LodgeStatus,
  WING_BY_GENDER,
} from '../enums/lodge.enums';
import { toBookingView } from '../mappers/lodge.mapper';
import { translateBookingConflict } from '../utils/booking-conflict.util';
import { likeContains } from '../utils/like.util';
import { LodgeScope } from '../utils/lodge-scope';
import { shortName } from '../utils/short-name.util';
import { LodgeBedSlotService } from './lodge-bed-slot.service';
import { LodgeBookingDocumentService } from './lodge-booking-document.service';
import { LodgeBookingRulesService } from './lodge-booking-rules.service';
import { LodgeNotifyService } from './lodge-notify.service';
import { LodgePasscodeService } from './lodge-passcode.service';

const BOOKING_RELATIONS = {
  lodge: true,
  bedSlot: { room: true },
  pickupBatch: true,
  pickupGate: true,
  corper: true,
  documents: true,
} as const;

// the booking lifecycle: a corper holds a bed in a transaction, the house admin reviews it
@Injectable()
export class LodgeBookingService {
  constructor(
    @InjectRepository(LodgeBooking)
    private readonly bookings: Repository<LodgeBooking>,
    @InjectRepository(LodgeBookingDocument)
    private readonly documents: Repository<LodgeBookingDocument>,
    @InjectRepository(Lodge) private readonly lodges: Repository<Lodge>,
    private readonly dataSource: DataSource,
    private readonly bedSlots: LodgeBedSlotService,
    private readonly passcodes: LodgePasscodeService,
    private readonly rules: LodgeBookingRulesService,
    private readonly docs: LodgeBookingDocumentService,
    private readonly notifier: LodgeNotifyService,
    private readonly pagination: PaginationProvider,
  ) {}

  // ---- corper ----

  async create(
    userId: string,
    lodgeId: string,
    dto: CreateBookingDto,
    files: Express.Multer.File[] = [],
  ): Promise<BookingView> {
    this.docs.assertValid(files);
    // fail fast before any upload; the unique index still backs this up
    await this.rules.assertNoActiveBooking(userId);

    const lodge = await this.lodges.findOne({
      where: { id: lodgeId, status: LodgeStatus.PUBLISHED },
      relations: { familyHouse: true },
    });
    if (!lodge || !lodge.familyHouse.isActive) {
      throw new NotFoundException('Lodge not found');
    }
    if (lodge.availability !== LodgeAvailability.OPEN) {
      throw new ConflictException(
        'This lodge is not accepting bookings right now',
      );
    }
    const passcode = this.passcodes.verify(dto.passcodeToken, userId, lodgeId);
    this.assertPickupAllowed(lodge, dto);

    const uploaded = await this.docs.upload(userId, lodge.id, files);

    let bookingId: string;
    try {
      bookingId = await this.dataSource.transaction((manager) =>
        this.hold(manager, lodge, dto, {
          corperId: userId,
          source: BookingSource.SELF,
          status: BookingStatus.PENDING,
          passcode,
          uploaded,
        }),
      );
    } catch (error) {
      await this.docs.purge(uploaded.map((doc) => doc.publicId));
      throw translateBookingConflict(error);
    }

    await this.notifier.send(lodge.familyHouse.adminUserId, {
      title: 'New lodge booking',
      body: `${dto.fullName} requested a bed at ${lodge.name}.`,
      data: { lodgeId, bookingId },
    });
    return this.view(bookingId);
  }

  async listMine(
    userId: string,
    query: MyBookingsQueryDto,
    baseUrl: string,
  ): Promise<Paginated<BookingView>> {
    const qb = this.baseQuery().where('booking.corper_id = :userId', {
      userId,
    });
    if (query.status) {
      qb.andWhere('booking.status = :status', { status: query.status });
    }
    return this.paginateViews(qb, query, baseUrl);
  }

  async getMine(userId: string, id: string): Promise<BookingView> {
    const booking = await this.bookings.findOne({
      where: { id, corperId: userId },
      relations: BOOKING_RELATIONS,
    });
    if (!booking) {
      throw new NotFoundException('Booking not found');
    }
    return toBookingView(booking);
  }

  async cancel(userId: string, id: string): Promise<BookingView> {
    const booking = await this.dataSource.transaction(async (manager) => {
      const current = await manager.findOne(LodgeBooking, {
        where: { id, corperId: userId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!current) {
        throw new NotFoundException('Booking not found');
      }
      this.assertStatus(current, [
        BookingStatus.PENDING,
        BookingStatus.CONFIRMED,
      ]);
      current.status = BookingStatus.CANCELLED;
      await this.bedSlots.releaseSlot(manager, current.bedSlotId);
      return manager.save(current);
    });

    const house = await this.houseOfLodge(booking.lodgeId);
    await this.notifier.send(house?.adminUserId ?? null, {
      title: 'Lodge booking cancelled',
      body: `${booking.fullName} cancelled their bed request.`,
      data: { lodgeId: booking.lodgeId, bookingId: booking.id },
    });
    return this.view(id);
  }

  // ---- house admin / super admin ----

  async list(
    scope: LodgeScope,
    query: BookingManageQueryDto,
    baseUrl: string,
  ): Promise<Paginated<BookingView>> {
    return this.paginateViews(this.filtered(scope, query), query, baseUrl);
  }

  // every row of the current filter, for the manifest download (capped)
  async listAll(
    scope: LodgeScope,
    query: BookingManageQueryDto,
  ): Promise<BookingView[]> {
    const bookings = await this.filtered(scope, query).take(5000).getMany();
    return this.withDocuments(bookings);
  }

  async get(scope: LodgeScope, id: string): Promise<BookingView> {
    const booking = await this.findScoped(scope, id);
    return toBookingView(booking);
  }

  // gate check: look a corper up by the passcode they show on arrival
  async getByPasscode(
    scope: LodgeScope,
    passcode: string,
  ): Promise<BookingView> {
    const booking = await this.bookings.findOne({
      where: {
        passcode: passcode.trim().toUpperCase(),
        ...(scope.familyHouseId ? { familyHouseId: scope.familyHouseId } : {}),
      },
      relations: BOOKING_RELATIONS,
    });
    if (!booking) {
      throw new NotFoundException('Booking not found');
    }
    return toBookingView(booking);
  }

  async confirm(scope: LodgeScope, id: string, reviewerId: string) {
    // nothing to await here: confirming only flips the status
    return this.review(scope, id, reviewerId, (_manager, booking) => {
      this.assertStatus(booking, [BookingStatus.PENDING]);
      booking.status = BookingStatus.CONFIRMED;
      return Promise.resolve({
        title: 'Lodge booking confirmed',
        body: `Your bed request is confirmed. Show passcode ${booking.passcode} on arrival.`,
      });
    });
  }

  async reject(
    scope: LodgeScope,
    id: string,
    reviewerId: string,
    reason: string,
  ) {
    return this.review(scope, id, reviewerId, async (manager, booking) => {
      this.assertStatus(booking, [
        BookingStatus.PENDING,
        BookingStatus.CONFIRMED,
      ]);
      booking.status = BookingStatus.REJECTED;
      booking.rejectionReason = reason;
      await this.bedSlots.releaseSlot(manager, booking.bedSlotId);
      return {
        title: 'Lodge booking declined',
        body: `Your bed request was declined: ${reason}`,
      };
    });
  }

  async checkIn(scope: LodgeScope, id: string, reviewerId: string) {
    return this.review(scope, id, reviewerId, async (manager, booking) => {
      this.assertStatus(booking, [BookingStatus.CONFIRMED]);
      const lodge = await manager.findOneByOrFail(Lodge, {
        id: booking.lodgeId,
      });
      if (lodge.bedSlotsEnabled && !booking.bedSlotId) {
        throw new ConflictException(
          'Assign a bed before admitting this corper',
        );
      }
      booking.status = BookingStatus.CHECKED_IN;
      booking.checkedInAt = new Date();
      if (booking.bedSlotId) {
        await manager.update(
          LodgeBedSlot,
          { id: booking.bedSlotId },
          { status: BedSlotStatus.OCCUPIED },
        );
      }
      return null;
    });
  }

  // walk-in entered by the exco: no account, confirmed straight away
  async createManual(
    scope: LodgeScope,
    reviewerId: string,
    dto: ManualBookingDto,
  ): Promise<BookingView> {
    const lodge = await this.lodges.findOne({
      where: {
        id: dto.lodgeId,
        ...(scope.familyHouseId ? { familyHouseId: scope.familyHouseId } : {}),
      },
    });
    if (!lodge) {
      throw new NotFoundException('Lodge not found');
    }
    this.assertPickupAllowed(lodge, dto);

    let bookingId: string;
    try {
      bookingId = await this.dataSource.transaction((manager) =>
        this.hold(manager, lodge, dto, {
          corperId: null,
          source: BookingSource.MANUAL,
          status: BookingStatus.CONFIRMED,
          passcode: this.passcodes.generate(lodge),
          uploaded: [],
          reviewerId,
        }),
      );
    } catch (error) {
      throw translateBookingConflict(error);
    }
    return this.view(bookingId);
  }

  // ---- internals ----

  // locks the bed, then writes the booking, the held bed and the documents together
  private async hold(
    manager: EntityManager,
    lodge: Lodge,
    dto: BookingDetailsDto,
    opts: {
      corperId: string | null;
      source: BookingSource;
      status: BookingStatus;
      passcode: string;
      uploaded: CloudinaryUploadResult[];
      reviewerId?: string;
    },
  ): Promise<string> {
    const manual = opts.source === BookingSource.MANUAL;
    // a shared lock makes a concurrent unpublish or close wait for this booking;
    // lodges that count heads (capped, or hybrid with open beds) take the exclusive lock
    const countsHeads =
      (!lodge.bedSlotsEnabled && lodge.capacity !== null) ||
      lodge.inventoryMode === InventoryMode.HYBRID;
    const live = await manager.findOne(Lodge, {
      where: { id: lodge.id },
      lock: { mode: countsHeads ? 'pessimistic_write' : 'pessimistic_read' },
    });
    if (
      !live ||
      (!manual &&
        (live.status !== LodgeStatus.PUBLISHED ||
          live.availability !== LodgeAvailability.OPEN))
    ) {
      throw new ConflictException(
        'This lodge is not accepting bookings right now',
      );
    }

    const slot = await this.takeBed(manager, live, dto);

    if (opts.corperId) {
      await this.rules.assertNoActiveBooking(opts.corperId, manager);
    }
    await this.rules.claimPickup(manager, lodge.id, {
      batchId: dto.pickupBatchId,
      gateId: dto.pickupGateId,
    });

    const booking = await manager.save(
      manager.create(LodgeBooking, {
        lodgeId: lodge.id,
        familyHouseId: lodge.familyHouseId,
        corperId: opts.corperId,
        source: opts.source,
        bedSlotId: slot?.id ?? null,
        pickupBatchId: dto.pickupBatchId ?? null,
        pickupGateId: dto.pickupGateId ?? null,
        passcode: opts.passcode,
        status: opts.status,
        fullName: dto.fullName,
        callUpNumber: dto.callUpNumber.toUpperCase(),
        whatsappPhone: dto.whatsappPhone,
        gender: dto.gender,
        lightsOutRoutine: dto.lightsOutRoutine ?? null,
        morningRoutine: dto.morningRoutine ?? null,
        luggageNote: dto.luggageNote ?? null,
        welfareNeed: dto.welfareNeed ?? null,
        nextOfKinName: dto.nextOfKinName ?? null,
        nextOfKinRelation: dto.nextOfKinRelation ?? null,
        nextOfKinPhone: dto.nextOfKinPhone ?? null,
        agreedToRulesAt: new Date(),
        reviewedBy: opts.reviewerId ?? null,
        reviewedAt: opts.reviewerId ? new Date() : null,
      }),
    );

    if (slot) {
      slot.status = BedSlotStatus.IN_TRANSIT;
      slot.occupantLabel = shortName(dto.fullName);
      await manager.save(slot);
    }

    await this.docs.attach(manager, booking.id, opts.uploaded);
    return booking.id;
  }

  // picks and locks the bed, or checks there is room when beds are not picked up front
  private async takeBed(
    manager: EntityManager,
    lodge: Lodge,
    dto: BookingDetailsDto,
  ): Promise<LodgeBedSlot | null> {
    const active = In([...ACTIVE_BOOKING_STATUSES]);

    if (!lodge.bedSlotsEnabled) {
      if (dto.bedSlotId) {
        throw new BadRequestException(
          'This lodge does not assign individual beds',
        );
      }
      if (lodge.capacity !== null) {
        const taken = await manager.count(LodgeBooking, {
          where: { lodgeId: lodge.id, status: active },
        });
        if (taken >= lodge.capacity) {
          throw new ConflictException('This lodge is full');
        }
      }
      return null;
    }

    if (!dto.bedSlotId) {
      // hybrid lodges let the exco map the bed after arrival
      if (lodge.inventoryMode !== InventoryMode.HYBRID) {
        throw new BadRequestException('bedSlotId is required for this lodge');
      }
      const [free, waiting] = await Promise.all([
        manager.count(LodgeBedSlot, {
          where: { lodgeId: lodge.id, status: BedSlotStatus.AVAILABLE },
        }),
        manager.count(LodgeBooking, {
          where: { lodgeId: lodge.id, status: active, bedSlotId: IsNull() },
        }),
      ]);
      if (free <= waiting) {
        throw new ConflictException('This lodge is full');
      }
      return null;
    }

    const slot = await manager.findOne(LodgeBedSlot, {
      where: { id: dto.bedSlotId, lodgeId: lodge.id },
      lock: { mode: 'pessimistic_write' },
    });
    if (!slot) {
      throw new NotFoundException('Bed slot not found');
    }
    if (slot.wing !== WING_BY_GENDER[dto.gender]) {
      throw new BadRequestException(
        `This bed is in the ${slot.wing} wing and does not match the selected gender`,
      );
    }
    if (slot.status !== BedSlotStatus.AVAILABLE) {
      throw new ConflictException(
        'This bed is no longer available. Pick another one',
      );
    }
    return slot;
  }

  // shared shape of confirm / reject / check-in: lock, apply, save, notify the corper
  private async review(
    scope: LodgeScope,
    id: string,
    reviewerId: string,
    apply: (
      manager: EntityManager,
      booking: LodgeBooking,
    ) => Promise<{ title: string; body: string } | null>,
  ): Promise<BookingView> {
    const { booking, message } = await this.dataSource.transaction(
      async (manager) => {
        const current = await manager.findOne(LodgeBooking, {
          where: {
            id,
            ...(scope.familyHouseId
              ? { familyHouseId: scope.familyHouseId }
              : {}),
          },
          lock: { mode: 'pessimistic_write' },
        });
        if (!current) {
          throw new NotFoundException('Booking not found');
        }
        const message = await apply(manager, current);
        current.reviewedBy = reviewerId;
        current.reviewedAt = new Date();
        return { booking: await manager.save(current), message };
      },
    );

    if (message) {
      await this.notifier.send(booking.corperId, {
        ...message,
        data: { lodgeId: booking.lodgeId, bookingId: booking.id },
      });
    }
    return this.view(id);
  }

  private assertStatus(booking: LodgeBooking, allowed: BookingStatus[]): void {
    if (!allowed.includes(booking.status)) {
      throw new ConflictException(
        `A ${booking.status} booking cannot be changed this way`,
      );
    }
  }

  private assertPickupAllowed(lodge: Lodge, dto: BookingDetailsDto): void {
    if (!lodge.pickupEnabled && (dto.pickupBatchId || dto.pickupGateId)) {
      throw new BadRequestException('This lodge does not offer camp pickup');
    }
  }

  private baseQuery() {
    return (
      this.bookings
        .createQueryBuilder('booking')
        .leftJoinAndSelect('booking.lodge', 'lodge')
        .leftJoinAndSelect('booking.bedSlot', 'bedSlot')
        .leftJoinAndSelect('bedSlot.room', 'room')
        .leftJoinAndSelect('booking.pickupBatch', 'pickupBatch')
        .leftJoinAndSelect('booking.pickupGate', 'pickupGate')
        // only the picture is needed from the account
        .leftJoin('booking.corper', 'corper')
        .addSelect(['corper.id', 'corper.profilePictureUrl'])
        .orderBy('booking.createdAt', 'DESC')
    );
  }

  // the roster filters, shared by the list, the export and the transit manifest
  private filtered(scope: LodgeScope, query: BookingManageQueryDto) {
    const qb = this.baseQuery();
    if (scope.familyHouseId) {
      qb.where('booking.family_house_id = :house', {
        house: scope.familyHouseId,
      });
    } else {
      qb.where('1 = 1');
    }
    if (query.lodgeId) {
      qb.andWhere('booking.lodge_id = :lodgeId', { lodgeId: query.lodgeId });
    }
    if (query.status) {
      qb.andWhere('booking.status = :status', { status: query.status });
    }
    if (query.wing === 'unassigned') {
      qb.andWhere('booking.bed_slot_id IS NULL');
    } else if (query.wing) {
      qb.andWhere('bedSlot.wing = :wing', { wing: query.wing });
    }
    if (query.roomId) {
      qb.andWhere('bedSlot.room_id = :roomId', { roomId: query.roomId });
    }
    if (query.pickupBatchId) {
      qb.andWhere('booking.pickup_batch_id = :batchId', {
        batchId: query.pickupBatchId,
      });
    }
    if (query.gateId) {
      qb.andWhere('booking.pickup_gate_id = :gateId', { gateId: query.gateId });
    }
    if (query.transitStatus) {
      qb.andWhere('booking.transit_status = :transit', {
        transit: query.transitStatus,
      });
    }
    if (query.hasPickup) {
      qb.andWhere('booking.pickup_batch_id IS NOT NULL');
    }
    if (query.search) {
      qb.andWhere(
        '(booking.full_name ILIKE :term OR booking.call_up_number ILIKE :term OR booking.passcode ILIKE :term)',
        { term: likeContains(query.search) },
      );
    }
    return qb;
  }

  // documents are a collection, so they load in one extra query for the whole page
  private async paginateViews(
    qb: ReturnType<LodgeBookingService['baseQuery']>,
    query: MyBookingsQueryDto | BookingManageQueryDto,
    baseUrl: string,
  ): Promise<Paginated<BookingView>> {
    const page = await this.pagination.paginateQuery(qb, query, baseUrl);
    return { ...page, data: await this.withDocuments(page.data) };
  }

  private async withDocuments(
    bookings: LodgeBooking[],
  ): Promise<BookingView[]> {
    const docs = bookings.length
      ? await this.documents.find({
          where: { bookingId: In(bookings.map((booking) => booking.id)) },
          order: { createdAt: 'ASC' },
        })
      : [];
    return bookings.map((booking) => {
      booking.documents = docs.filter((doc) => doc.bookingId === booking.id);
      return toBookingView(booking);
    });
  }

  private async findScoped(
    scope: LodgeScope,
    id: string,
  ): Promise<LodgeBooking> {
    const booking = await this.bookings.findOne({
      where: {
        id,
        ...(scope.familyHouseId ? { familyHouseId: scope.familyHouseId } : {}),
      },
      relations: BOOKING_RELATIONS,
    });
    if (!booking) {
      throw new NotFoundException('Booking not found');
    }
    return booking;
  }

  private async view(id: string): Promise<BookingView> {
    const booking = await this.bookings.findOneOrFail({
      where: { id },
      relations: BOOKING_RELATIONS,
    });
    return toBookingView(booking);
  }

  private async houseOfLodge(lodgeId: string): Promise<FamilyHouse | null> {
    const lodge = await this.lodges.findOne({
      where: { id: lodgeId },
      relations: { familyHouse: true },
      withDeleted: true,
    });
    return lodge?.familyHouse ?? null;
  }
}
