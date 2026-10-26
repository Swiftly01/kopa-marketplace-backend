import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  DataSource,
  EntityManager,
  Repository,
  SelectQueryBuilder,
} from 'typeorm';
import { PaginationProvider } from '../../../common/pagination/providers/pagination.provider';
import { Paginated } from '../../../common/pagination/interfaces/paginated.interface';
import { AppLogger } from '../../../logger/logger.service';
import { LocationService } from '../../location/location.service';
import { ListingCategoryRegistry } from '../categories/listing-category.registry';
import { MIN_PHOTOS_TO_PUBLISH } from '../constants/listing.constants';
import { CreateListingDto } from '../dtos/create-listing.dto';
import { ListingQueryDto, MyListingsQueryDto } from '../dtos/listing-query.dto';
import {
  AdminListingDetailView,
  ListingCardView,
  ListingDetailView,
} from '../dtos/listing-response.dto';
import { UpdateListingDto } from '../dtos/update-listing.dto';
import { ListingImage } from '../entities/listing-image.entity';
import { Listing } from '../entities/listing.entity';
import { ListingStatus } from '../enums/listing-status.enum';
import { NegotiationStatus } from '../enums/negotiation-status.enum';
import { toCardView, toDetailView } from '../mappers/listing.mapper';
import { pickDefined } from '../utils/pick-defined';
import { buildListingSlug } from '../utils/slug.util';
import { ListingCategoryService } from './listing-category.service';
import { ListingImageService } from './listing-image.service';

// matches no row; used when a requested category does not exist
const NO_CATEGORY = '00000000-0000-0000-0000-000000000000';

// category-agnostic listing lifecycle: draft -> publish (live at once) -> pause / remove; admins can reject afterwards
@Injectable()
export class ListingService {
  constructor(
    @InjectRepository(Listing)
    private readonly listings: Repository<Listing>,
    private readonly dataSource: DataSource,
    private readonly categoryService: ListingCategoryService,
    private readonly registry: ListingCategoryRegistry,
    private readonly locations: LocationService,
    private readonly imageService: ListingImageService,
    private readonly pagination: PaginationProvider,
    private readonly logger: AppLogger,
  ) {}

  // creates a DRAFT; photos are added next and then the listing is published
  async create(
    userId: string,
    dto: CreateListingDto,
  ): Promise<ListingDetailView> {
    const { category, handler } = await this.categoryService.requirePostable(
      dto.categoryId,
    );
    const locality = this.locations.resolveLocality(dto.stateCode, dto.lgaName);
    const details = await handler.validateDetails(dto.details);

    const listingId = await this.dataSource.transaction(async (manager) => {
      const listing = await manager.save(
        manager.create(Listing, {
          userId,
          categoryId: category.id,
          title: dto.title,
          slug: buildListingSlug(dto.title),
          description: dto.description,
          price: dto.price,
          negotiable: dto.negotiable ?? NegotiationStatus.NOT_SURE,
          videoUrl: dto.videoUrl ?? null,
          ...locality,
          status: ListingStatus.DRAFT,
        }),
      );
      await handler.saveDetails(manager, listing.id, details);
      return listing.id;
    });

    this.logger.log(
      `Listing ${listingId} drafted by user ${userId} in ${category.code}`,
      ListingService.name,
    );
    return this.getOwned(userId, listingId);
  }

  // owner edit; the status is left alone, so a live ad stays live
  async update(
    userId: string,
    listingId: string,
    dto: UpdateListingDto,
  ): Promise<ListingDetailView> {
    const listing = await this.findOwnedOrFail(userId, listingId);
    await this.applyUpdate(listing, dto);
    return this.getOwned(userId, listingId);
  }

  // admin edit of any ad; the status is left alone
  async adminUpdate(
    listingId: string,
    dto: UpdateListingDto,
  ): Promise<AdminListingDetailView> {
    const listing = await this.findAnyOrFail(listingId);
    await this.applyUpdate(listing, dto);
    return this.getForAdmin(listingId);
  }

  // admin detail: any status, with the owner's contact details
  async getForAdmin(listingId: string): Promise<AdminListingDetailView> {
    const listing = await this.findAnyOrFail(listingId);
    const view = await this.toDetail(listing);
    const { user } = listing;
    return {
      ...view,
      seller: user
        ? {
            id: user.id,
            name: `${user.firstName} ${user.lastName}`.trim(),
            email: user.email,
            phoneNumber: user.phoneNumber,
            isEmailVerified: user.isEmailVerified,
            joinedAt: user.createdAt,
          }
        : null,
      reviewedAt: listing.reviewedAt,
      reviewedBy: listing.reviewedBy,
    };
  }

  // shared by owner and admin edits: validates, then writes core + category fields
  private async applyUpdate(
    listing: Listing,
    dto: UpdateListingDto,
  ): Promise<void> {
    const handler = this.registry.get(listing.category.code);

    if ((dto.stateCode === undefined) !== (dto.lgaName === undefined)) {
      throw new BadRequestException(
        'stateCode and lgaName must be sent together',
      );
    }

    const details =
      dto.details === undefined
        ? undefined
        : await handler.validateDetails(dto.details);
    const locality =
      dto.stateCode !== undefined && dto.lgaName !== undefined
        ? this.locations.resolveLocality(dto.stateCode, dto.lgaName)
        : {};

    // the slug is kept on purpose so shared links never break
    const patch = {
      ...pickDefined({
        title: dto.title,
        description: dto.description,
        price: dto.price,
        negotiable: dto.negotiable,
        videoUrl: dto.videoUrl,
      }),
      ...locality,
    };
    const changed = Object.keys(patch).length > 0 || details !== undefined;

    await this.dataSource.transaction(async (manager) => {
      if (changed) {
        await manager.update(Listing, listing.id, patch);
      }
      if (details) {
        await handler.saveDetails(manager, listing.id, details);
      }
    });
  }

  // draft/paused -> live at once; a rejected ad is resubmitted for an admin to re-check
  async publish(userId: string, listingId: string): Promise<ListingDetailView> {
    await this.dataSource.transaction(async (manager) => {
      const listing = await manager.findOne(Listing, {
        where: { id: listingId, userId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!listing) {
        throw new NotFoundException('Listing not found');
      }
      if (
        listing.status === ListingStatus.ACTIVE ||
        listing.status === ListingStatus.PENDING_REVIEW
      ) {
        return;
      }

      // a paused ad already has its photos, so it can go straight back live
      if (listing.status !== ListingStatus.INACTIVE) {
        await this.assertEnoughPhotos(manager, listingId);
      }

      const wasRejected = listing.status === ListingStatus.REJECTED;
      listing.status = wasRejected
        ? ListingStatus.PENDING_REVIEW
        : ListingStatus.ACTIVE;
      if (!wasRejected) {
        listing.publishedAt ??= new Date();
      }
      listing.rejectionReason = null;
      await manager.save(listing);
    });

    return this.getOwned(userId, listingId);
  }

  private async assertEnoughPhotos(
    manager: EntityManager,
    listingId: string,
  ): Promise<void> {
    const photoCount = await manager.count(ListingImage, {
      where: { listingId },
    });
    if (photoCount < MIN_PHOTOS_TO_PUBLISH) {
      throw new BadRequestException(
        `Add at least ${MIN_PHOTOS_TO_PUBLISH} photos before publishing (you have ${photoCount})`,
      );
    }
  }

  // hides a published listing (e.g. already let) without deleting it
  async deactivate(
    userId: string,
    listingId: string,
  ): Promise<ListingDetailView> {
    const listing = await this.findOwnedOrFail(userId, listingId);
    if (
      listing.status !== ListingStatus.ACTIVE &&
      listing.status !== ListingStatus.INACTIVE
    ) {
      throw new BadRequestException('Only live listings can be paused');
    }
    if (listing.status === ListingStatus.ACTIVE) {
      await this.listings.update(listing.id, {
        status: ListingStatus.INACTIVE,
      });
    }
    return this.getOwned(userId, listingId);
  }

  // soft-deletes the listing and frees its photos from storage
  async remove(userId: string, listingId: string): Promise<void> {
    const listing = await this.findOwnedOrFail(userId, listingId);

    const publicIds = await this.dataSource.transaction(async (manager) => {
      const ids = await this.imageService.deleteAll(manager, listing.id);
      await manager.update(Listing, listing.id, {
        status: ListingStatus.REMOVED,
      });
      await manager.softDelete(Listing, listing.id);
      return ids;
    });

    await this.imageService.purgeFromStorage(publicIds);
    this.logger.log(
      `Listing ${listingId} removed by user ${userId}`,
      ListingService.name,
    );
  }

  // the owner's view of their own listing in any status
  async getOwned(
    userId: string,
    listingId: string,
  ): Promise<ListingDetailView> {
    const listing = await this.findOwnedOrFail(userId, listingId);
    return this.toDetail(listing);
  }

  // public detail page; only published listings are visible
  async getPublicBySlug(slug: string): Promise<ListingDetailView> {
    const listing = await this.listings
      .createQueryBuilder('listing')
      .leftJoinAndSelect('listing.category', 'category')
      .leftJoinAndSelect('listing.images', 'image')
      .leftJoin('listing.user', 'user')
      .addSelect([
        'user.id',
        'user.firstName',
        'user.lastName',
        'user.phoneNumber',
        'user.isEmailVerified',
        'user.createdAt',
      ])
      .where('listing.slug = :slug', { slug })
      .andWhere('listing.status = :status', { status: ListingStatus.ACTIVE })
      .getOne();
    if (!listing) {
      throw new NotFoundException('Listing not found');
    }
    return this.toDetail(listing);
  }

  async listMine(
    userId: string,
    query: MyListingsQueryDto,
    baseUrl: string,
  ): Promise<Paginated<ListingCardView>> {
    const qb = this.cardQuery().where('listing.userId = :userId', { userId });
    if (query.status) {
      qb.andWhere('listing.status = :status', { status: query.status });
    }
    this.applySearch(qb, query.search);
    qb.orderBy('listing.createdAt', 'DESC');
    return this.paginateCards(qb, query, baseUrl);
  }

  // public browse of published listings
  async search(
    query: ListingQueryDto,
    baseUrl: string,
  ): Promise<Paginated<ListingCardView>> {
    const qb = this.cardQuery().where('listing.status = :status', {
      status: ListingStatus.ACTIVE,
    });
    const branchIds = await this.categoryService.getBranchIds(query);
    if (branchIds) {
      // an unknown category matches nothing instead of everything
      qb.andWhere('listing.categoryId IN (:...branchIds)', {
        branchIds: branchIds.length ? branchIds : [NO_CATEGORY],
      });
    }
    if (query.sellerId) {
      qb.andWhere('listing.userId = :sellerId', { sellerId: query.sellerId });
    }
    if (query.stateName) {
      qb.andWhere('LOWER(listing.stateName) = :stateName', {
        stateName: query.stateName.toLowerCase(),
      });
    }
    if (query.stateCode) {
      qb.andWhere('UPPER(listing.stateCode) = :stateCode', {
        stateCode: query.stateCode.toUpperCase(),
      });
    }
    if (query.lgaName) {
      qb.andWhere('LOWER(listing.lgaName) = :lgaName', {
        lgaName: query.lgaName.toLowerCase(),
      });
    }
    if (query.minPrice !== undefined) {
      qb.andWhere('listing.price >= :minPrice', { minPrice: query.minPrice });
    }
    if (query.maxPrice !== undefined) {
      qb.andWhere('listing.price <= :maxPrice', { maxPrice: query.maxPrice });
    }
    this.applySearch(qb, query.search);
    qb.orderBy('listing.publishedAt', 'DESC');
    return this.paginateCards(qb, query, baseUrl);
  }

  // base query for list screens: only the title picture is joined
  private cardQuery(): SelectQueryBuilder<Listing> {
    return this.listings
      .createQueryBuilder('listing')
      .leftJoinAndSelect('listing.images', 'image', 'image.position = 0');
  }

  private applySearch(
    qb: SelectQueryBuilder<Listing>,
    search: string | undefined,
  ): void {
    if (search) {
      qb.andWhere('listing.title ILIKE :search', { search: `%${search}%` });
    }
  }

  private async paginateCards(
    qb: SelectQueryBuilder<Listing>,
    query: ListingQueryDto | MyListingsQueryDto,
    baseUrl: string,
  ): Promise<Paginated<ListingCardView>> {
    const page = await this.pagination.paginateQuery(qb, query, baseUrl);
    return { ...page, data: page.data.map(toCardView) };
  }

  private async toDetail(listing: Listing): Promise<ListingDetailView> {
    // a category whose handler was removed still shows its core data
    const handler = this.registry.find(listing.category.code);
    const details = handler
      ? await handler.findDetails(this.dataSource.manager, listing.id)
      : null;
    return toDetailView(listing, details);
  }

  // not-found (never forbidden) so ids of other people's listings are not leaked
  private async findOwnedOrFail(
    userId: string,
    listingId: string,
  ): Promise<Listing> {
    const listing = await this.listings.findOne({
      where: { id: listingId, userId },
      relations: { category: true, images: true },
      order: { images: { position: 'ASC' } },
    });
    if (!listing) {
      throw new NotFoundException('Listing not found');
    }
    return listing;
  }

  // any listing regardless of owner (admin use)
  private async findAnyOrFail(listingId: string): Promise<Listing> {
    const listing = await this.listings.findOne({
      where: { id: listingId },
      relations: { category: true, images: true, user: true },
      order: { images: { position: 'ASC' } },
    });
    if (!listing) {
      throw new NotFoundException('Listing not found');
    }
    return listing;
  }
}
