import { HouseRule, TransitInfo } from '../entities/lodge.entity';
import {
  BedSlotStatus,
  BatchStatus,
  BedWing,
  BookingStatus,
  BunkType,
  CorperGender,
  DocumentsStatus,
  FamilyHouseApplicationStatus,
  InventoryMode,
  LodgeAvailability,
  LodgeStatus,
  BookingSource,
  TransitStatus,
} from '../enums/lodge.enums';

export interface LodgeImageView {
  id: string;
  url: string;
  thumbnailUrl: string | null;
  label: string | null;
  isCover: boolean;
  position: number;
  sizeBytes: number | null;
}

export interface WingSummary {
  total: number;
  available: number;
  inTransit: number;
  occupied: number;
  held: number;
}

export interface BedSummaryView extends WingSummary {
  wings: Record<BedWing, WingSummary>;
}

export interface AmenityView {
  code: string;
  label: string;
  description: string | null;
}

export interface PickupBatchView {
  id: string;
  label: string;
  startTime: string;
  endTime: string;
  capacity: number;
  seatsBooked: number;
  seatsLeft: number;
  // luggage and loading notes
  vehicleNote: string | null;
  gate: { id: string; name: string } | null;
  vehicleName: string | null;
  driverName: string | null;
  driverPhone: string | null;
  status: BatchStatus;
  departedAt: Date | null;
  arrivedAt: Date | null;
  tripMinutes: number | null;
  // 0-100 while in transit, 100 once completed
  progressPercent: number;
  etaMinutesRemaining: number | null;
}

export type PublicPickupBatchView = Omit<
  PickupBatchView,
  'driverName' | 'driverPhone'
>;

export interface PublicGateView {
  id: string;
  name: string;
  description: string | null;
}

export interface GateView extends PublicGateView {
  marshalName: string | null;
  marshalPhone: string | null;
  marshalWhatsappLink: string | null;
}

export interface SetupView {
  steps: {
    identity: boolean;
    bedSlots: boolean;
    photos: boolean;
    amenities: boolean;
    pickup: boolean;
  };
  completed: number;
  totalSteps: number;
  progressPercent: number;
  readyToPublish: boolean;
}

export interface LodgeCardView {
  id: string;
  slug: string;
  name: string;
  fellowship: string | null;
  address: string;
  landmark: string | null;
  stateName: string | null;
  lgaName: string | null;
  coverImage: { url: string; thumbnailUrl: string | null } | null;
  amenities: string[];
  pricePerBed: number | null;
  status: LodgeStatus;
  availability: LodgeAvailability;
  hasPickup: boolean;
  inventoryMode: InventoryMode;
  bedSlotsEnabled: boolean;
  // without bed slots: the optional overall cap and the spots left under it
  capacity: number | null;
  beds: { total: number; available: number };
  publishedAt: Date | null;
}

export interface LodgeDetailView extends Omit<LodgeCardView, 'amenities'> {
  mapsUrl: string | null;
  latitude: number | null;
  longitude: number | null;
  coordinatorName: string | null;
  hotline: string | null;
  whatsappNumber: string | null;
  amenities: AmenityView[];
  houseRules: HouseRule[];
  images: LodgeImageView[];
  beds: BedSummaryView;
  pickup: {
    enabled: boolean;
    date: string | null;
    gates: PublicGateView[];
    batches: PublicPickupBatchView[];
  };
}

// house admin / super admin view: public detail plus management data
export interface LodgeManageView extends Omit<LodgeDetailView, 'pickup'> {
  familyHouseId: string;
  pickup: {
    enabled: boolean;
    date: string | null;
    gates: GateView[];
    batches: PickupBatchView[];
    logisticsLeadName: string | null;
    logisticsLeadPhone: string | null;
    transitInfo: TransitInfo | null;
  };
  setup: SetupView;
  createdAt: Date;
  updatedAt: Date;
}

export interface BedSlotView {
  id: string;
  roomId: string | null;
  code: string;
  wing: BedWing;
  bunkType: BunkType;
  locationNote: string | null;
  status: BedSlotStatus;
  occupantLabel: string | null;
}

export interface BookingDocumentView {
  id: string;
  url: string;
  fileName: string;
  format: string | null;
  sizeBytes: number | null;
}

export interface BookingView {
  id: string;
  passcode: string;
  status: BookingStatus;
  source: BookingSource;
  fullName: string;
  callUpNumber: string;
  whatsappPhone: string;
  // wa.me link the exco opens to message the corper
  whatsappLink: string;
  profilePictureUrl: string | null;
  gender: CorperGender;
  lightsOutRoutine: string | null;
  morningRoutine: string | null;
  welfareNeed: string | null;
  luggageNote: string | null;
  nextOfKin: {
    name: string;
    relation: string | null;
    phone: string | null;
  } | null;
  rejectionReason: string | null;
  lodge: { id: string; name: string; slug: string; address: string };
  bedSlot: {
    id: string;
    code: string;
    wing: BedWing;
    bunkType: BunkType;
    locationNote: string | null;
    room: { id: string; code: string; name: string } | null;
  } | null;
  pickup: {
    date: string | null;
    gate: { id: string; name: string } | null;
    batch: {
      id: string;
      label: string;
      startTime: string;
      endTime: string;
      status: BatchStatus;
    } | null;
  };
  transit: {
    status: TransitStatus;
    gateArrivedAt: Date | null;
    boardedAt: Date | null;
    arrivedAt: Date | null;
  };
  documentsStatus: DocumentsStatus;
  documentsVerifiedAt: Date | null;
  documents: BookingDocumentView[];
  checkedInAt: Date | null;
  createdAt: Date;
}

export interface PersonView {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
}

export interface FamilyHouseView {
  id: string;
  name: string;
  fellowship: string | null;
  address: string | null;
  stateName: string | null;
  lgaName: string | null;
  contactPhone: string | null;
  description: string | null;
  isActive: boolean;
  admin: PersonView | null;
  // lodges the house runs (archived ones excluded)
  lodgeCount: number;
  createdAt: Date;
}

export interface FamilyHouseStatsView {
  total: number;
  active: number;
  inactive: number;
  withoutAdmin: number;
  pendingApplications: number;
}

export interface FamilyHouseApplicationView {
  id: string;
  status: FamilyHouseApplicationStatus;
  houseName: string;
  fellowship: string | null;
  address: string;
  stateName: string;
  lgaName: string;
  contactPhone: string;
  description: string | null;
  applicant: PersonView & { phoneNumber: string | null };
  rejectionReason: string | null;
  reviewedAt: Date | null;
  familyHouse: { id: string; name: string } | null;
  createdAt: Date;
}
