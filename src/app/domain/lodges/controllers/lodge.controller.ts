import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import type { Request } from 'express';
import multer from 'multer';
import { CurrentUser } from '../../../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import type { JwtUser } from '../../../common/types/request-with-user.interface';
import {
  MAX_BOOKING_DOCUMENT_BYTES,
  MAX_BOOKING_DOCUMENTS,
} from '../constants/lodge.constants';
import {
  CreateBookingDto,
  UpdateMyBookingDto,
} from '../dtos/lodge-booking.dto';
import {
  BedSlotQueryDto,
  CorperLodgeQueryDto,
  MyBookingsQueryDto,
} from '../dtos/lodge-query.dto';
import { LodgeBookingDocumentService } from '../services/lodge-booking-document.service';
import { LodgeBookingEditService } from '../services/lodge-booking-edit.service';
import { LodgeBookingService } from '../services/lodge-booking.service';
import { LodgeBrowseService } from '../services/lodge-browse.service';
import { fullUrl } from '../utils/full-url';

// corper-facing: browse published lodges, then book a bed (login required)
@UseGuards(JwtAuthGuard)
@Controller('lodges')
export class LodgeController {
  constructor(
    private readonly browse: LodgeBrowseService,
    private readonly bookings: LodgeBookingService,
  ) {}

  @Get()
  async search(@Query() query: CorperLodgeQueryDto, @Req() req: Request) {
    const data = await this.browse.search(query, fullUrl(req));
    return { success: true, message: 'Lodges fetched successfully', data };
  }

  // static paths first so ':id' never swallows them
  @Get('slug/:slug')
  async getBySlug(@Param('slug') slug: string) {
    const data = await this.browse.getBySlug(slug);
    return { success: true, message: 'Lodge fetched successfully', data };
  }

  @Get(':id')
  async getById(@Param('id', ParseUUIDPipe) id: string) {
    const data = await this.browse.getById(id);
    return { success: true, message: 'Lodge fetched successfully', data };
  }

  // step 2: free beds, optionally limited to the wing of the given gender
  @Get(':id/bed-slots')
  async bedSlots(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: BedSlotQueryDto,
  ) {
    const data = await this.browse.availableBeds(id, query.gender);
    return { success: true, message: 'Bed slots fetched successfully', data };
  }

  // step 4: the admission passcode shown before submitting
  @Post(':id/bookings/passcode')
  @HttpCode(HttpStatus.OK)
  async passcode(
    @CurrentUser() user: JwtUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const data = await this.browse.previewPasscode(user.id, id);
    return { success: true, message: 'Passcode issued', data };
  }

  // step 4 submit: multipart with the form fields and up to 3 `documents` files
  @Post(':id/bookings')
  @UseInterceptors(
    FilesInterceptor('documents', MAX_BOOKING_DOCUMENTS, {
      storage: multer.memoryStorage(),
      limits: { fileSize: MAX_BOOKING_DOCUMENT_BYTES },
    }),
  )
  async book(
    @CurrentUser() user: JwtUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateBookingDto,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    const data = await this.bookings.create(user.id, id, dto, files);
    return { success: true, message: 'Booking submitted', data };
  }
}

// a corper's own bookings
@UseGuards(JwtAuthGuard)
@Controller('lodge-bookings')
export class LodgeBookingController {
  constructor(
    private readonly bookings: LodgeBookingService,
    private readonly edits: LodgeBookingEditService,
    private readonly documents: LodgeBookingDocumentService,
  ) {}

  @Get('mine')
  async mine(
    @CurrentUser() user: JwtUser,
    @Query() query: MyBookingsQueryDto,
    @Req() req: Request,
  ) {
    const data = await this.bookings.listMine(user.id, query, fullUrl(req));
    return { success: true, message: 'Bookings fetched successfully', data };
  }

  @Get(':id')
  async get(
    @CurrentUser() user: JwtUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const data = await this.bookings.getMine(user.id, id);
    return { success: true, message: 'Booking fetched successfully', data };
  }

  // edit what was submitted: details, bed and pickup (null clears an optional field)
  @Patch(':id')
  async update(
    @CurrentUser() user: JwtUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateMyBookingDto,
  ) {
    const data = await this.edits.update(user.id, id, dto);
    return { success: true, message: 'Booking updated', data };
  }

  // adds supporting documents (multipart, files `documents`)
  @Post(':id/documents')
  @UseInterceptors(
    FilesInterceptor('documents', MAX_BOOKING_DOCUMENTS, {
      storage: multer.memoryStorage(),
      limits: { fileSize: MAX_BOOKING_DOCUMENT_BYTES },
    }),
  )
  async addDocuments(
    @CurrentUser() user: JwtUser,
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    await this.documents.add(user.id, id, files ?? []);
    const data = await this.bookings.getMine(user.id, id);
    return { success: true, message: 'Documents added', data };
  }

  @Delete(':id/documents/:documentId')
  async removeDocument(
    @CurrentUser() user: JwtUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('documentId', ParseUUIDPipe) documentId: string,
  ) {
    await this.documents.remove(user.id, id, documentId);
    const data = await this.bookings.getMine(user.id, id);
    return { success: true, message: 'Document removed', data };
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  async cancel(
    @CurrentUser() user: JwtUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const data = await this.bookings.cancel(user.id, id);
    return { success: true, message: 'Booking cancelled', data };
  }
}
