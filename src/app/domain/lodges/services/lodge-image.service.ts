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
} from '../../listings/constants/listing.constants';
import {
  MAX_LODGE_PHOTOS,
  MIN_LODGE_PHOTOS_TO_PUBLISH,
} from '../constants/lodge.constants';
import { LodgeImageView } from '../dtos/lodge-response.dto';
import { UpdateLodgeImageDto } from '../dtos/lodge-setup.dto';
import { LodgeImage } from '../entities/lodge-image.entity';
import { Lodge } from '../entities/lodge.entity';
import { LodgeStatus } from '../enums/lodge.enums';
import { toImageView } from '../mappers/lodge.mapper';
import { lodgePhotoFolder } from '../utils/lodge-folder.util';
import { LodgeScope } from '../utils/lodge-scope';
import { LodgeAccessService } from './lodge-access.service';

const SUPPORTED_FORMATS: readonly string[] = LISTING_PHOTO_FORMATS;

// the lodge photo gallery: exactly one cover, contiguous positions, all-or-nothing uploads
@Injectable()
export class LodgeImageService {
  constructor(
    @InjectRepository(LodgeImage)
    private readonly images: Repository<LodgeImage>,
    private readonly dataSource: DataSource,
    private readonly cloudinary: CloudinaryService,
    private readonly access: LodgeAccessService,
    private readonly logger: AppLogger,
  ) {}

  async list(scope: LodgeScope, lodgeId: string): Promise<LodgeImageView[]> {
    await this.access.find(lodgeId, scope);
    return this.listRaw(lodgeId);
  }

  async add(
    scope: LodgeScope,
    lodgeId: string,
    files: Express.Multer.File[],
  ): Promise<LodgeImageView[]> {
    this.assertValidFiles(files);

    // cheap pre-check so we never upload photos we would have to discard
    const lodge = await this.access.find(lodgeId, scope);
    await this.assertRoomFor(this.dataSource.manager, lodgeId, files.length);

    const uploaded = await this.uploadAll(lodge, files);

    try {
      await this.dataSource.transaction(async (manager) => {
        await this.access.find(lodgeId, scope, manager, true);
        const existing = await this.assertRoomFor(
          manager,
          lodgeId,
          uploaded.length,
        );
        await manager.save(
          LodgeImage,
          uploaded.map((photo, index) =>
            manager.create(LodgeImage, {
              lodgeId,
              url: photo.secureUrl,
              thumbnailUrl: photo.thumbnailUrl ?? null,
              publicId: photo.publicId,
              label: null,
              // the first photo of an empty gallery is the cover
              isCover: existing === 0 && index === 0,
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

    return this.listRaw(lodgeId);
  }

  async update(
    scope: LodgeScope,
    lodgeId: string,
    imageId: string,
    dto: UpdateLodgeImageDto,
  ): Promise<LodgeImageView[]> {
    await this.dataSource.transaction(async (manager) => {
      await this.access.find(lodgeId, scope, manager, true);
      const image = await this.findImage(manager, lodgeId, imageId);

      if (dto.label !== undefined) image.label = dto.label;

      if (dto.isCover === false && image.isCover) {
        throw new BadRequestException(
          'A lodge always has a cover photo. Set another photo as cover instead',
        );
      }
      if (dto.isCover === true && !image.isCover) {
        // unset first: the partial unique index allows one cover at a time
        await manager.update(
          LodgeImage,
          { lodgeId, isCover: true },
          { isCover: false },
        );
        image.isCover = true;
      }
      await manager.save(image);
    });
    return this.listRaw(lodgeId);
  }

  async remove(
    scope: LodgeScope,
    lodgeId: string,
    imageId: string,
  ): Promise<LodgeImageView[]> {
    let publicId = '';

    await this.dataSource.transaction(async (manager) => {
      const lodge = await this.access.find(lodgeId, scope, manager, true);
      const image = await this.findImage(manager, lodgeId, imageId);

      const count = await manager.count(LodgeImage, { where: { lodgeId } });
      if (
        lodge.status === LodgeStatus.PUBLISHED &&
        count - 1 < MIN_LODGE_PHOTOS_TO_PUBLISH
      ) {
        throw new BadRequestException(
          `A published lodge needs at least ${MIN_LODGE_PHOTOS_TO_PUBLISH} photos. Unpublish it first`,
        );
      }

      await manager.delete(LodgeImage, { id: image.id });

      // close the gap so positions stay contiguous
      const later = await manager.find(LodgeImage, {
        where: { lodgeId, position: MoreThan(image.position) },
        order: { position: 'ASC' },
      });
      later.forEach((photo) => (photo.position -= 1));
      await manager.save(later);

      // the cover cannot disappear: promote the first remaining photo
      if (image.isCover) {
        const first = await manager.findOne(LodgeImage, {
          where: { lodgeId },
          order: { position: 'ASC' },
        });
        if (first) {
          first.isCover = true;
          await manager.save(first);
        }
      }

      publicId = image.publicId;
    });

    await this.purgeFromStorage([publicId]);
    return this.listRaw(lodgeId);
  }

  // removes every photo row and returns the storage ids to purge after commit
  async deleteAll(manager: EntityManager, lodgeId: string): Promise<string[]> {
    const images = await manager.find(LodgeImage, { where: { lodgeId } });
    await manager.delete(LodgeImage, { lodgeId });
    return images.map((image) => image.publicId);
  }

  // best effort: an orphaned file is wasted storage, never a failed request
  async purgeFromStorage(publicIds: string[]): Promise<void> {
    const results = await Promise.allSettled(
      publicIds.map((publicId) => this.cloudinary.deleteFile(publicId)),
    );
    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        this.logger.warn(
          `Could not delete lodge photo ${publicIds[index]} from storage`,
          LodgeImageService.name,
        );
      }
    });
  }

  private async listRaw(lodgeId: string): Promise<LodgeImageView[]> {
    const images = await this.images.find({
      where: { lodgeId },
      order: { position: 'ASC' },
    });
    return images.map(toImageView);
  }

  private async findImage(
    manager: EntityManager,
    lodgeId: string,
    imageId: string,
  ): Promise<LodgeImage> {
    const image = await manager.findOne(LodgeImage, {
      where: { id: imageId, lodgeId },
    });
    if (!image) {
      throw new NotFoundException('Photo not found');
    }
    return image;
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
          `${file.originalname}: each photo must not exceed ${MAX_PHOTO_SIZE_MB} MB`,
        );
      }
    }
  }

  // returns how many photos exist so the caller can append after them
  private async assertRoomFor(
    manager: EntityManager,
    lodgeId: string,
    incoming: number,
  ): Promise<number> {
    const existing = await manager.count(LodgeImage, { where: { lodgeId } });
    if (existing + incoming > MAX_LODGE_PHOTOS) {
      throw new BadRequestException(
        `A lodge can have at most ${MAX_LODGE_PHOTOS} photos (you have ${existing})`,
      );
    }
    return existing;
  }

  private async uploadAll(
    lodge: Lodge,
    files: Express.Multer.File[],
  ): Promise<CloudinaryUploadResult[]> {
    const folder = lodgePhotoFolder(lodge.familyHouseId, lodge.id);
    const results = await Promise.allSettled(
      files.map((file) =>
        this.cloudinary.uploadFile(
          file.buffer,
          // a generated name avoids public-id clashes between same-named files
          `${randomUUID()}.${this.extensionOf(file.originalname)}`,
          folder,
          ['lodge', 'photo'],
          { allowedFormats: [...LISTING_PHOTO_FORMATS], resourceType: 'image' },
        ),
      ),
    );

    const uploaded = results.flatMap((result) =>
      result.status === 'fulfilled' ? [result.value] : [],
    );
    if (uploaded.length !== files.length) {
      await this.purgeFromStorage(uploaded.map((photo) => photo.publicId));
      throw new BadGatewayException(
        'Some photos could not be uploaded. Please try again',
      );
    }
    return uploaded;
  }

  private extensionOf(fileName: string): string | undefined {
    const parts = fileName.split('.');
    return parts.length > 1 ? parts.pop()?.toLowerCase() : undefined;
  }
}
