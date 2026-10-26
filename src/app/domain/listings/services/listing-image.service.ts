import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import { DataSource, EntityManager, MoreThan, Repository } from 'typeorm';
import { CloudinaryService } from '../../../cloudinary/cloudinary.service';
import { CloudinaryUploadResult } from '../../../cloudinary/interfaces/cloudinary-upload-result';
import { AppLogger } from '../../../logger/logger.service';
import {
  LISTING_PHOTO_FORMATS,
  MAX_PHOTO_SIZE_BYTES,
  MAX_PHOTO_SIZE_MB,
  MAX_PHOTOS_PER_LISTING,
  MIN_PHOTOS_TO_PUBLISH,
} from '../constants/listing.constants';
import { ListingImageView } from '../dtos/listing-response.dto';
import { ListingImage } from '../entities/listing-image.entity';
import { Listing } from '../entities/listing.entity';
import { ListingStatus } from '../enums/listing-status.enum';
import { toImageView } from '../mappers/listing.mapper';
import { listingPhotoFolder } from '../utils/cloudinary-folder.util';

const SUPPORTED_FORMATS: readonly string[] = LISTING_PHOTO_FORMATS;

// owns the photo gallery of a listing: upload, delete, reorder, cleanup
// userId = null means an admin is acting (any listing)
@Injectable()
export class ListingImageService {
  constructor(
    @InjectRepository(ListingImage)
    private readonly images: Repository<ListingImage>,
    private readonly dataSource: DataSource,
    private readonly cloudinary: CloudinaryService,
    private readonly logger: AppLogger,
  ) {}

  async list(listingId: string): Promise<ListingImageView[]> {
    const images = await this.images.find({
      where: { listingId },
      order: { position: 'ASC' },
    });
    return images.map(toImageView);
  }

  async add(
    userId: string,
    listingId: string,
    files: Express.Multer.File[],
  ): Promise<ListingImageView[]> {
    this.assertValidFiles(files);

    // cheap pre-check so we do not upload photos we would have to throw away
    await this.findOwned(this.dataSource.manager, listingId, userId);
    await this.assertRoomFor(this.dataSource.manager, listingId, files.length);

    const uploaded = await this.uploadAll(userId, listingId, files);

    try {
      await this.dataSource.transaction(async (manager) => {
        await this.findOwned(manager, listingId, userId, true);
        const existing = await this.assertRoomFor(
          manager,
          listingId,
          uploaded.length,
        );
        await manager.save(
          ListingImage,
          uploaded.map((photo, index) =>
            manager.create(ListingImage, {
              listingId,
              url: photo.secureUrl,
              thumbnailUrl: photo.thumbnailUrl ?? null,
              publicId: photo.publicId,
              // positions are contiguous, so the next free slot is the count
              position: existing + index,
              format: photo.format,
              sizeBytes: photo.fileSize,
            }),
          ),
        );
      });
    } catch (error) {
      await this.purgeFromStorage(uploaded.map((photo) => photo.publicId));
      throw error;
    }

    return this.list(listingId);
  }

  async remove(
    userId: string | null,
    listingId: string,
    imageId: string,
  ): Promise<ListingImageView[]> {
    let publicId = '';

    await this.dataSource.transaction(async (manager) => {
      const listing = await this.findOwned(manager, listingId, userId, true);
      const image = await manager.findOne(ListingImage, {
        where: { id: imageId, listingId },
      });
      if (!image) {
        throw new NotFoundException('Photo not found');
      }

      const count = await manager.count(ListingImage, { where: { listingId } });
      if (
        (listing.status === ListingStatus.ACTIVE ||
          listing.status === ListingStatus.PENDING_REVIEW) &&
        count - 1 < MIN_PHOTOS_TO_PUBLISH
      ) {
        throw new BadRequestException(
          `A live or submitted listing needs at least ${MIN_PHOTOS_TO_PUBLISH} photos`,
        );
      }

      await manager.delete(ListingImage, { id: image.id });

      // close the gap so positions stay contiguous
      const later = await manager.find(ListingImage, {
        where: { listingId, position: MoreThan(image.position) },
      });
      later.forEach((photo) => (photo.position -= 1));
      await manager.save(later);

      publicId = image.publicId;
    });

    await this.purgeFromStorage([publicId]);
    return this.list(listingId);
  }

  async reorder(
    userId: string | null,
    listingId: string,
    imageIds: string[],
  ): Promise<ListingImageView[]> {
    await this.dataSource.transaction(async (manager) => {
      await this.findOwned(manager, listingId, userId, true);
      const images = await manager.find(ListingImage, { where: { listingId } });

      const coversEveryPhoto =
        images.length === imageIds.length &&
        images.every((image) => imageIds.includes(image.id));
      if (!coversEveryPhoto) {
        throw new BadRequestException(
          'imageIds must list every photo of this listing exactly once',
        );
      }

      images.forEach((image) => (image.position = imageIds.indexOf(image.id)));
      await manager.save(images);
    });

    return this.list(listingId);
  }

  // removes every photo row and returns the storage ids to purge after commit
  async deleteAll(
    manager: EntityManager,
    listingId: string,
  ): Promise<string[]> {
    const images = await manager.find(ListingImage, { where: { listingId } });
    await manager.delete(ListingImage, { listingId });
    return images.map((image) => image.publicId);
  }

  // best effort: an orphaned file is only wasted storage, never a failed request
  async purgeFromStorage(publicIds: string[]): Promise<void> {
    const results = await Promise.allSettled(
      publicIds.map((publicId) => this.cloudinary.deleteFile(publicId)),
    );
    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        this.logger.warn(
          `Could not delete photo ${publicIds[index]} from storage`,
          ListingImageService.name,
        );
      }
    });
  }

  private assertValidFiles(files: Express.Multer.File[] | undefined): void {
    if (!files?.length) {
      throw new BadRequestException('No photos uploaded');
    }
    for (const file of files) {
      const extension = this.extensionOf(file.originalname);
      if (!extension || !SUPPORTED_FORMATS.includes(extension)) {
        throw new BadRequestException(
          `${file.originalname}: unsupported format. Use JPG, PNG, HEIC or WEBP`,
        );
      }
      if (file.size > MAX_PHOTO_SIZE_BYTES) {
        throw new BadRequestException(
          `${file.originalname}: each picture must not exceed ${MAX_PHOTO_SIZE_MB} Mb`,
        );
      }
    }
  }

  // returns how many photos exist so the caller can append after them
  private async assertRoomFor(
    manager: EntityManager,
    listingId: string,
    incoming: number,
  ): Promise<number> {
    const existing = await manager.count(ListingImage, {
      where: { listingId },
    });
    if (existing + incoming > MAX_PHOTOS_PER_LISTING) {
      throw new BadRequestException(
        `A listing can have at most ${MAX_PHOTOS_PER_LISTING} photos (you have ${existing})`,
      );
    }
    return existing;
  }

  private async uploadAll(
    userId: string,
    listingId: string,
    files: Express.Multer.File[],
  ): Promise<CloudinaryUploadResult[]> {
    const folder = listingPhotoFolder(userId, listingId);
    const results = await Promise.allSettled(
      files.map((file) =>
        this.cloudinary.uploadFile(
          file.buffer,
          // a generated name avoids public-id clashes between same-named files
          `${randomUUID()}.${this.extensionOf(file.originalname)}`,
          folder,
          ['listing', 'photo'],
          { allowedFormats: [...LISTING_PHOTO_FORMATS], resourceType: 'image' },
        ),
      ),
    );

    const uploaded = results.flatMap((result) =>
      result.status === 'fulfilled' ? [result.value] : [],
    );
    if (uploaded.length !== files.length) {
      // all or nothing: do not leave a half-uploaded batch behind
      await this.purgeFromStorage(uploaded.map((photo) => photo.publicId));
      throw new BadGatewayException(
        'Some photos could not be uploaded. Please try again',
      );
    }
    return uploaded;
  }

  // the owner's listing (any listing when userId is null) or a 404; lock=true (inside a transaction) serialises concurrent photo edits
  private async findOwned(
    manager: EntityManager,
    listingId: string,
    userId: string | null,
    lock = false,
  ): Promise<Listing> {
    const listing = await manager.findOne(Listing, {
      where: userId === null ? { id: listingId } : { id: listingId, userId },
      ...(lock ? { lock: { mode: 'pessimistic_write' as const } } : {}),
    });
    if (!listing) {
      throw new NotFoundException('Listing not found');
    }
    return listing;
  }

  private extensionOf(fileName: string): string | undefined {
    const parts = fileName.split('.');
    return parts.length > 1 ? parts.pop()?.toLowerCase() : undefined;
  }
}
