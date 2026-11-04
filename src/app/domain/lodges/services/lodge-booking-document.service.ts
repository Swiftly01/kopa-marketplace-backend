import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { CloudinaryService } from '../../../cloudinary/cloudinary.service';
import { CloudinaryUploadResult } from '../../../cloudinary/interfaces/cloudinary-upload-result';
import {
  BOOKING_DOCUMENT_FORMATS,
  MAX_BOOKING_DOCUMENT_BYTES,
  MAX_BOOKING_DOCUMENT_MB,
  MAX_BOOKING_DOCUMENTS,
} from '../constants/lodge.constants';
import { LodgeBookingDocument } from '../entities/lodge-booking-document.entity';
import { LodgeBooking } from '../entities/lodge-booking.entity';
import { bookingDocumentFolder } from '../utils/lodge-folder.util';
import { LodgeBookingRulesService } from './lodge-booking-rules.service';
import { LodgeImageService } from './lodge-image.service';

const FORMATS: readonly string[] = BOOKING_DOCUMENT_FORMATS;

const extensionOf = (fileName: string): string | undefined =>
  fileName.split('.').pop()?.toLowerCase();

// a booking's supporting documents: validate, upload, attach, remove
@Injectable()
export class LodgeBookingDocumentService {
  constructor(
    @InjectRepository(LodgeBookingDocument)
    private readonly documents: Repository<LodgeBookingDocument>,
    @InjectRepository(LodgeBooking)
    private readonly bookings: Repository<LodgeBooking>,
    private readonly dataSource: DataSource,
    private readonly cloudinary: CloudinaryService,
    private readonly lodgeImages: LodgeImageService,
    private readonly rules: LodgeBookingRulesService,
  ) {}

  assertValid(files: Express.Multer.File[]): void {
    if (files.length > MAX_BOOKING_DOCUMENTS) {
      throw new BadRequestException(
        `You can attach at most ${MAX_BOOKING_DOCUMENTS} documents`,
      );
    }
    for (const file of files) {
      const extension = extensionOf(file.originalname);
      if (!extension || !FORMATS.includes(extension)) {
        throw new BadRequestException(
          `${file.originalname}: unsupported format. Use PDF, JPG or PNG`,
        );
      }
      if (file.size > MAX_BOOKING_DOCUMENT_BYTES) {
        throw new BadRequestException(
          `${file.originalname}: each file must not exceed ${MAX_BOOKING_DOCUMENT_MB} MB`,
        );
      }
    }
  }

  // all or nothing: a partial upload is purged and the request fails
  async upload(
    userId: string,
    lodgeId: string,
    files: Express.Multer.File[],
  ): Promise<CloudinaryUploadResult[]> {
    const folder = bookingDocumentFolder(lodgeId, userId);
    const results = await Promise.allSettled(
      files.map((file) =>
        this.cloudinary.uploadFile(
          file.buffer,
          `${randomUUID()}.${extensionOf(file.originalname)}`,
          folder,
          ['lodge-booking', 'document'],
          {
            allowedFormats: [...BOOKING_DOCUMENT_FORMATS],
            resourceType: 'auto',
          },
        ),
      ),
    );

    // keep the client's file name for display (the stored one is generated)
    const uploaded = results.flatMap((result, index) =>
      result.status === 'fulfilled'
        ? [{ ...result.value, fileName: files[index].originalname }]
        : [],
    );
    if (uploaded.length !== files.length) {
      await this.purge(uploaded.map((doc) => doc.publicId));
      throw new BadGatewayException(
        'Some documents could not be uploaded. Please try again',
      );
    }
    return uploaded;
  }

  // writes the document rows inside the caller's transaction
  async attach(
    manager: EntityManager,
    bookingId: string,
    uploaded: CloudinaryUploadResult[],
  ): Promise<void> {
    if (!uploaded.length) return;
    await manager.save(
      LodgeBookingDocument,
      uploaded.map((doc) =>
        manager.create(LodgeBookingDocument, {
          bookingId,
          url: doc.secureUrl,
          publicId: doc.publicId,
          fileName: doc.fileName,
          format: doc.format,
          sizeBytes: doc.fileSize,
        }),
      ),
    );
  }

  // best effort: an orphaned file is wasted storage, never a failed request
  purge(publicIds: string[]): Promise<void> {
    return this.lodgeImages.purgeFromStorage(publicIds);
  }

  // corper adds more files to a booking that is still pending or confirmed
  async add(
    userId: string,
    bookingId: string,
    files: Express.Multer.File[],
  ): Promise<void> {
    if (!files.length) {
      throw new BadRequestException('Attach at least one document');
    }
    this.assertValid(files);

    const booking = await this.dataSource.transaction((manager) =>
      this.rules.lockEditable(manager, userId, bookingId),
    );
    await this.assertRoomFor(bookingId, files.length);

    const uploaded = await this.upload(userId, booking.lodgeId, files);
    try {
      await this.dataSource.transaction(async (manager) => {
        const locked = await this.rules.lockEditable(
          manager,
          userId,
          bookingId,
        );
        await this.assertRoomFor(bookingId, uploaded.length, manager);
        await this.attach(manager, bookingId, uploaded);
        await this.resetVerification(manager, locked);
      });
    } catch (error) {
      await this.purge(uploaded.map((doc) => doc.publicId));
      throw error;
    }
  }

  async remove(
    userId: string,
    bookingId: string,
    documentId: string,
  ): Promise<void> {
    const publicId = await this.dataSource.transaction(async (manager) => {
      const booking = await this.rules.lockEditable(manager, userId, bookingId);
      const doc = await manager.findOne(LodgeBookingDocument, {
        where: { id: documentId, bookingId },
      });
      if (!doc) {
        throw new NotFoundException('Document not found');
      }
      await manager.delete(LodgeBookingDocument, { id: doc.id });
      await this.resetVerification(manager, booking);
      return doc.publicId;
    });
    await this.purge([publicId]);
  }

  // the exco verified the old files, so any change asks for a fresh look
  private async resetVerification(
    manager: EntityManager,
    booking: LodgeBooking,
  ): Promise<void> {
    if (!booking.documentsVerifiedAt) return;
    booking.documentsVerifiedAt = null;
    booking.documentsVerifiedBy = null;
    await manager.save(booking);
  }

  private async assertRoomFor(
    bookingId: string,
    incoming: number,
    manager?: EntityManager,
  ): Promise<void> {
    const repo = manager
      ? manager.getRepository(LodgeBookingDocument)
      : this.documents;
    const existing = await repo.count({ where: { bookingId } });
    if (existing + incoming > MAX_BOOKING_DOCUMENTS) {
      throw new BadRequestException(
        `A booking holds at most ${MAX_BOOKING_DOCUMENTS} documents. Remove one first`,
      );
    }
  }
}
