import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationModule } from '../../notification/notification.module';
import { LocationModule } from '../location/location.module';
import { User } from '../users/entities/user.entity';
import {
  AdminFamilyHouseApplicationController,
  FamilyHouseApplicationController,
} from './controllers/family-house-application.controller';
import { AdminLodgeController } from './controllers/admin-lodge.controller';
import { FamilyHouseBookingController } from './controllers/family-house-booking.controller';
import { FamilyHouseOpsController } from './controllers/family-house-ops.controller';
import { FamilyHouseLodgeController } from './controllers/family-house-lodge.controller';
import {
  LodgeBookingController,
  LodgeController,
} from './controllers/lodge.controller';
import { FamilyHouseApplication } from './entities/family-house-application.entity';
import { FamilyHouse } from './entities/family-house.entity';
import { LodgeBedSlot } from './entities/lodge-bed-slot.entity';
import { LodgeBookingDocument } from './entities/lodge-booking-document.entity';
import { LodgeAssemblyGate } from './entities/lodge-assembly-gate.entity';
import { LodgeRoom } from './entities/lodge-room.entity';
import { LodgeBooking } from './entities/lodge-booking.entity';
import { LodgeImage } from './entities/lodge-image.entity';
import { LodgePickupBatch } from './entities/lodge-pickup-batch.entity';
import { Lodge } from './entities/lodge.entity';
import { FamilyHouseAdminGuard } from './guards/family-house-admin.guard';
import { FamilyHouseApplicationService } from './services/family-house-application.service';
import { FamilyHouseService } from './services/family-house.service';
import { LodgeAccessService } from './services/lodge-access.service';
import { LodgeBedSlotService } from './services/lodge-bed-slot.service';
import { LodgeDeskService } from './services/lodge-desk.service';
import { LodgeInventoryService } from './services/lodge-inventory.service';
import { LodgeMessagingService } from './services/lodge-messaging.service';
import { LodgeRoomService } from './services/lodge-room.service';
import { LodgeTransitService } from './services/lodge-transit.service';
import { LodgeBookingDocumentService } from './services/lodge-booking-document.service';
import { LodgeBookingEditService } from './services/lodge-booking-edit.service';
import { LodgeBookingRulesService } from './services/lodge-booking-rules.service';
import { LodgeBookingService } from './services/lodge-booking.service';
import { LodgeNotifyService } from './services/lodge-notify.service';
import { LodgeBrowseService } from './services/lodge-browse.service';
import { LodgeImageService } from './services/lodge-image.service';
import { LodgePasscodeService } from './services/lodge-passcode.service';
import { LodgePickupService } from './services/lodge-pickup.service';
import { LodgeViewService } from './services/lodge-view.service';
import { LodgeService } from './services/lodge.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      FamilyHouse,
      FamilyHouseApplication,
      Lodge,
      LodgeImage,
      LodgeBedSlot,
      LodgePickupBatch,
      LodgeBooking,
      LodgeBookingDocument,
      LodgeRoom,
      LodgeAssemblyGate,
      User,
    ]),
    LocationModule,
    NotificationModule,
  ],
  controllers: [
    FamilyHouseLodgeController,
    FamilyHouseBookingController,
    FamilyHouseOpsController,
    AdminLodgeController,
    FamilyHouseApplicationController,
    AdminFamilyHouseApplicationController,
    LodgeController,
    LodgeBookingController,
  ],
  providers: [
    FamilyHouseAdminGuard,
    LodgeBookingRulesService,
    LodgeBookingDocumentService,
    LodgeBookingEditService,
    LodgeNotifyService,
    FamilyHouseService,
    FamilyHouseApplicationService,
    LodgeAccessService,
    LodgeBedSlotService,
    LodgeViewService,
    LodgeImageService,
    LodgePickupService,
    LodgeService,
    LodgePasscodeService,
    LodgeBrowseService,
    LodgeBookingService,
    LodgeMessagingService,
    LodgeRoomService,
    LodgeInventoryService,
    LodgeTransitService,
    LodgeDeskService,
  ],
  // the admin module changes user roles through this service
  exports: [FamilyHouseService],
})
export class LodgeModule {}
