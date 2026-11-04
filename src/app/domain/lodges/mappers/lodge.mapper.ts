import { User } from '../../users/entities/user.entity';
import {
  AMENITY_PRESETS,
  MIN_LODGE_PHOTOS_TO_PUBLISH,
} from '../constants/lodge.constants';
import {
  AmenityView,
  BedSlotView,
  BedSummaryView,
  BookingView,
  FamilyHouseApplicationView,
  FamilyHouseView,
  PersonView,
  GateView,
  PublicGateView,
  PublicPickupBatchView,
  LodgeCardView,
  LodgeDetailView,
  LodgeImageView,
  LodgeManageView,
  PickupBatchView,
  SetupView,
  WingSummary,
} from '../dtos/lodge-response.dto';
import { FamilyHouse } from '../entities/family-house.entity';
import { FamilyHouseApplication } from '../entities/family-house-application.entity';
import { RoomView } from '../dtos/lodge-ops-response.dto';
import { LodgeAssemblyGate } from '../entities/lodge-assembly-gate.entity';
import { LodgeRoom } from '../entities/lodge-room.entity';
import { LodgeBedSlot } from '../entities/lodge-bed-slot.entity';
import { LodgeBooking } from '../entities/lodge-booking.entity';
import { LodgeImage } from '../entities/lodge-image.entity';
import { LodgePickupBatch } from '../entities/lodge-pickup-batch.entity';
import { Lodge } from '../entities/lodge.entity';
import { BatchStatus, BedWing, DocumentsStatus } from '../enums/lodge.enums';
import { toWhatsappLink } from '../utils/whatsapp.util';

const PRESETS = new Map<string, (typeof AMENITY_PRESETS)[number]>(
  AMENITY_PRESETS.map((preset) => [preset.code, preset]),
);

export const emptyWing = (): WingSummary => ({
  total: 0,
  available: 0,
  inTransit: 0,
  occupied: 0,
  held: 0,
});

export const emptyBeds = (): BedSummaryView => ({
  ...emptyWing(),
  wings: { [BedWing.MALE]: emptyWing(), [BedWing.FEMALE]: emptyWing() },
});

export const toImageView = (image: LodgeImage): LodgeImageView => ({
  id: image.id,
  url: image.url,
  thumbnailUrl: image.thumbnailUrl,
  label: image.label,
  isCover: image.isCover,
  position: image.position,
  sizeBytes: image.sizeBytes,
});

export const toBedSlotView = (slot: LodgeBedSlot): BedSlotView => ({
  id: slot.id,
  roomId: slot.roomId,
  code: slot.code,
  wing: slot.wing,
  bunkType: slot.bunkType,
  locationNote: slot.locationNote,
  status: slot.status,
  occupantLabel: slot.occupantLabel,
});

// preset codes get their label; custom amenities use the text itself
export const toAmenityView = (code: string): AmenityView => {
  const preset = PRESETS.get(code);
  return {
    code,
    label: preset?.label ?? code,
    description: preset?.description ?? null,
  };
};

// progress of a trip on the road, from the planned drive time
function tripProgress(batch: LodgePickupBatch): {
  progressPercent: number;
  etaMinutesRemaining: number | null;
} {
  if (batch.status === BatchStatus.COMPLETED) {
    return { progressPercent: 100, etaMinutesRemaining: 0 };
  }
  if (
    batch.status !== BatchStatus.IN_TRANSIT ||
    !batch.departedAt ||
    !batch.tripMinutes
  ) {
    return { progressPercent: 0, etaMinutesRemaining: null };
  }
  const elapsed = (Date.now() - batch.departedAt.getTime()) / 60000;
  return {
    progressPercent: Math.min(
      99,
      Math.round((elapsed / batch.tripMinutes) * 100),
    ),
    etaMinutesRemaining: Math.max(0, Math.round(batch.tripMinutes - elapsed)),
  };
}

// batch must be loaded with its gate
export const toBatchView = (
  batch: LodgePickupBatch,
  seatsBooked: number,
): PickupBatchView => ({
  id: batch.id,
  label: batch.label,
  startTime: batch.startTime,
  endTime: batch.endTime,
  capacity: batch.capacity,
  seatsBooked,
  seatsLeft: Math.max(0, batch.capacity - seatsBooked),
  vehicleNote: batch.vehicleNote,
  gate: batch.gate ? { id: batch.gate.id, name: batch.gate.name } : null,
  vehicleName: batch.vehicleName,
  driverName: batch.driverName,
  driverPhone: batch.driverPhone,
  status: batch.status,
  departedAt: batch.departedAt,
  arrivedAt: batch.arrivedAt,
  tripMinutes: batch.tripMinutes,
  ...tripProgress(batch),
});

// corpers do not see driver details
export const toPublicBatchView = ({
  // driverName: _name,
  //driverPhone: _phone,
  ...rest
}: PickupBatchView): PublicPickupBatchView => rest;

export const toPublicGateView = (gate: LodgeAssemblyGate): PublicGateView => ({
  id: gate.id,
  name: gate.name,
  description: gate.description,
});

export const toRoomView = (room: LodgeRoom): RoomView => ({
  id: room.id,
  code: room.code,
  name: room.name,
  description: room.description,
  kind: room.kind,
  wing: room.wing,
  features: room.features,
  rentContribution: room.rentContribution,
  position: room.position,
});

export const toGateView = (gate: LodgeAssemblyGate): GateView => ({
  ...toPublicGateView(gate),
  marshalName: gate.marshalName,
  marshalPhone: gate.marshalPhone,
  marshalWhatsappLink: toWhatsappLink(gate.marshalPhone),
});

export function computeSetup(
  lodge: Lodge,
  counts: { photos: number; bedSlots: number; batches: number; gates: number },
): SetupView {
  const steps = {
    identity: Boolean(
      lodge.name &&
      lodge.address &&
      lodge.coordinatorName &&
      lodge.hotline &&
      lodge.whatsappNumber,
    ),
    // lodges that do not track beds have nothing to set up here
    bedSlots: !lodge.bedSlotsEnabled || counts.bedSlots > 0,
    photos: counts.photos >= MIN_LODGE_PHOTOS_TO_PUBLISH,
    amenities: lodge.amenities.length > 0,
    // pickup is optional: only incomplete when switched on and half configured
    pickup:
      !lodge.pickupEnabled ||
      Boolean(lodge.pickupDate && counts.gates > 0 && counts.batches > 0),
  };
  const completed = Object.values(steps).filter(Boolean).length;
  const totalSteps = Object.keys(steps).length;
  return {
    steps,
    completed,
    totalSteps,
    progressPercent: Math.round((completed / totalSteps) * 100),
    readyToPublish: completed === totalSteps,
  };
}

export const toCardView = (
  lodge: Lodge,
  cover: LodgeImage | undefined,
  beds: { total: number; available: number },
): LodgeCardView => ({
  id: lodge.id,
  slug: lodge.slug,
  name: lodge.name,
  fellowship: lodge.fellowship,
  address: lodge.address,
  landmark: lodge.landmark,
  stateName: lodge.stateName,
  lgaName: lodge.lgaName,
  coverImage: cover
    ? { url: cover.url, thumbnailUrl: cover.thumbnailUrl }
    : null,
  amenities: lodge.amenities,
  pricePerBed: lodge.pricePerBed,
  status: lodge.status,
  availability: lodge.availability,
  hasPickup: lodge.pickupEnabled,
  inventoryMode: lodge.inventoryMode,
  bedSlotsEnabled: lodge.bedSlotsEnabled,
  capacity: lodge.capacity,
  beds,
  publishedAt: lodge.publishedAt,
});

export function toDetailView(
  lodge: Lodge,
  images: LodgeImage[],
  beds: BedSummaryView,
  batches: PickupBatchView[],
  gates: LodgeAssemblyGate[],
): LodgeDetailView {
  const cover = images.find((image) => image.isCover);
  return {
    ...toCardView(lodge, cover, {
      total: beds.total,
      available: beds.available,
    }),
    mapsUrl: lodge.mapsUrl,
    latitude: lodge.latitude,
    longitude: lodge.longitude,
    coordinatorName: lodge.coordinatorName,
    hotline: lodge.hotline,
    whatsappNumber: lodge.whatsappNumber,
    amenities: lodge.amenities.map(toAmenityView),
    houseRules: lodge.houseRules,
    images: images.map(toImageView),
    beds,
    pickup: {
      enabled: lodge.pickupEnabled,
      date: lodge.pickupDate,
      gates: gates.map(toPublicGateView),
      batches: batches
        .filter((batch) => batch.status !== BatchStatus.CANCELLED)
        .map(toPublicBatchView),
    },
  };
}

export function toManageView(
  lodge: Lodge,
  images: LodgeImage[],
  beds: BedSummaryView,
  batches: PickupBatchView[],
  gates: LodgeAssemblyGate[],
): LodgeManageView {
  const { pickup: publicPickup, ...detail } = toDetailView(
    lodge,
    images,
    beds,
    batches,
    gates,
  );
  return {
    ...detail,
    familyHouseId: lodge.familyHouseId,
    pickup: {
      enabled: publicPickup.enabled,
      date: publicPickup.date,
      gates: gates.map(toGateView),
      batches,
      logisticsLeadName: lodge.logisticsLeadName,
      logisticsLeadPhone: lodge.logisticsLeadPhone,
      transitInfo: lodge.transitInfo,
    },
    setup: computeSetup(lodge, {
      photos: images.length,
      bedSlots: beds.total,
      batches: batches.length,
      gates: gates.length,
    }),
    createdAt: lodge.createdAt,
    updatedAt: lodge.updatedAt,
  };
}

const documentsStatusOf = (booking: LodgeBooking): DocumentsStatus =>
  booking.documentsVerifiedAt
    ? DocumentsStatus.VERIFIED
    : (booking.documents ?? []).length === 0
      ? DocumentsStatus.MISSING
      : DocumentsStatus.PENDING;

// booking must be loaded with lodge, bedSlot (+room), pickupBatch, pickupGate, corper and documents
export const toBookingView = (booking: LodgeBooking): BookingView => ({
  id: booking.id,
  passcode: booking.passcode,
  status: booking.status,
  source: booking.source,
  fullName: booking.fullName,
  callUpNumber: booking.callUpNumber,
  whatsappPhone: booking.whatsappPhone,
  whatsappLink: toWhatsappLink(booking.whatsappPhone) ?? '',
  profilePictureUrl: booking.corper?.profilePictureUrl ?? null,
  gender: booking.gender,
  lightsOutRoutine: booking.lightsOutRoutine,
  morningRoutine: booking.morningRoutine,
  welfareNeed: booking.welfareNeed,
  luggageNote: booking.luggageNote,
  nextOfKin: booking.nextOfKinName
    ? {
        name: booking.nextOfKinName,
        relation: booking.nextOfKinRelation,
        phone: booking.nextOfKinPhone,
      }
    : null,
  rejectionReason: booking.rejectionReason,
  lodge: {
    id: booking.lodge.id,
    name: booking.lodge.name,
    slug: booking.lodge.slug,
    address: booking.lodge.address,
  },
  bedSlot: booking.bedSlot
    ? {
        id: booking.bedSlot.id,
        code: booking.bedSlot.code,
        wing: booking.bedSlot.wing,
        bunkType: booking.bedSlot.bunkType,
        locationNote: booking.bedSlot.locationNote,
        room: booking.bedSlot.room
          ? {
              id: booking.bedSlot.room.id,
              code: booking.bedSlot.room.code,
              name: booking.bedSlot.room.name,
            }
          : null,
      }
    : null,
  pickup: {
    date: booking.lodge.pickupDate,
    gate: booking.pickupGate
      ? { id: booking.pickupGate.id, name: booking.pickupGate.name }
      : null,
    batch: booking.pickupBatch
      ? {
          id: booking.pickupBatch.id,
          label: booking.pickupBatch.label,
          startTime: booking.pickupBatch.startTime,
          endTime: booking.pickupBatch.endTime,
          status: booking.pickupBatch.status,
        }
      : null,
  },
  transit: {
    status: booking.transitStatus,
    gateArrivedAt: booking.gateArrivedAt,
    boardedAt: booking.boardedAt,
    arrivedAt: booking.arrivedAt,
  },
  documentsStatus: documentsStatusOf(booking),
  documentsVerifiedAt: booking.documentsVerifiedAt,
  documents: (booking.documents ?? []).map((doc) => ({
    id: doc.id,
    url: doc.url,
    fileName: doc.fileName,
    format: doc.format,
    sizeBytes: doc.sizeBytes,
  })),
  checkedInAt: booking.checkedInAt,
  createdAt: booking.createdAt,
});

export const toPersonView = (
  user: Pick<User, 'id' | 'email' | 'firstName' | 'lastName'>,
): PersonView => ({
  id: user.id,
  email: user.email,
  firstName: user.firstName,
  lastName: user.lastName,
});

export const toFamilyHouseView = (
  house: FamilyHouse,
  admin: Pick<User, 'id' | 'email' | 'firstName' | 'lastName'> | null,
  lodgeCount = 0,
): FamilyHouseView => ({
  id: house.id,
  name: house.name,
  fellowship: house.fellowship,
  address: house.address,
  stateName: house.stateName,
  lgaName: house.lgaName,
  contactPhone: house.contactPhone,
  description: house.description,
  isActive: house.isActive,
  admin: admin ? toPersonView(admin) : null,
  lodgeCount,
  createdAt: house.createdAt,
});

// application must be loaded with its applicant (and familyHouse once approved)
export const toApplicationView = (
  application: FamilyHouseApplication,
): FamilyHouseApplicationView => ({
  id: application.id,
  status: application.status,
  houseName: application.houseName,
  fellowship: application.fellowship,
  address: application.address,
  stateName: application.stateName,
  lgaName: application.lgaName,
  contactPhone: application.contactPhone,
  description: application.description,
  applicant: {
    ...toPersonView(application.applicant),
    phoneNumber: application.applicant.phoneNumber ?? null,
  },
  rejectionReason: application.rejectionReason,
  reviewedAt: application.reviewedAt,
  familyHouse: application.familyHouse
    ? { id: application.familyHouse.id, name: application.familyHouse.name }
    : null,
  createdAt: application.createdAt,
});
