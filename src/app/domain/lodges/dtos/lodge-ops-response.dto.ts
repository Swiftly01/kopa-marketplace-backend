import {
  BedSlotStatus,
  BedWing,
  BookingStatus,
  InventoryMode,
  RoomKind,
} from '../enums/lodge.enums';
import { TransitInfo } from '../entities/lodge.entity';
import {
  BedSlotView,
  GateView,
  PickupBatchView,
  WingSummary,
} from './lodge-response.dto';

export interface RoomView {
  id: string;
  code: string;
  name: string;
  description: string | null;
  kind: RoomKind;
  wing: BedWing | null;
  features: string[];
  rentContribution: number | null;
  position: number;
}

export interface SlotOccupantView {
  bookingId: string | null;
  name: string;
  status: BookingStatus | null;
  documentsVerified: boolean;
}

export interface InventorySlotView extends BedSlotView {
  // who holds the bed; null when it is free
  occupant: SlotOccupantView | null;
}

export interface InventoryRoomView extends RoomView {
  summary: WingSummary;
  slots: InventorySlotView[];
}

export interface UnassignedCorperView {
  bookingId: string;
  fullName: string;
  gender: string;
  callUpNumber: string;
  status: BookingStatus;
  registeredAt: Date;
}

export interface InventoryView {
  mode: InventoryMode;
  bedSlotsEnabled: boolean;
  stats: {
    totalCapacity: number;
    roomCount: number;
    occupiedAndReserved: number;
    fillRatePercent: number;
    available: number;
    held: number;
  };
  rooms: InventoryRoomView[];
  // beds that belong to no room (dorm bunks)
  looseSlots: InventorySlotView[];
  unassigned: UnassignedCorperView[];
}

export interface DeskSummaryView {
  totalRegistrations: number;
  newInLast24h: number;
  confirmedAndAdmitted: number;
  checkedIn: number;
  gatePending: number;
  cancelledOrRejected: number;
  // admitted / registrations
  admissionRatePercent: number;
  capacity: { total: number; filled: number; fillRatePercent: number };
  demographics: {
    male: number;
    female: number;
    malePercent: number;
    femalePercent: number;
  };
  byStatus: Record<BookingStatus, number>;
  documentsAwaitingVerification: number;
  withoutBed: number;
}

export interface TransitGateView extends GateView {
  registered: number;
  waiting: number;
}

export interface TransitBatchView extends PickupBatchView {
  atGate: number;
  boarded: number;
  arrived: number;
}

export interface TransitDashboardView {
  stats: {
    corpersOptedForTransit: number;
    totalActiveCorpers: number;
    atGate: number;
    avgWaitMinutes: number;
    inTransit: number;
    arrivedAtLodge: number;
    vehicles: number;
  };
  gates: TransitGateView[];
  batches: TransitBatchView[];
  corridor: TransitInfo | null;
  logisticsLead: { name: string | null; phone: string | null };
  date: string | null;
}

export type { BedSlotStatus };
