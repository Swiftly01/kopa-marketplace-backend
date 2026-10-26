import { ListingStatus } from '../enums/listing-status.enum';

// editing a live or paused ad pulls it back into review; other statuses stay as they are
export function statusAfterOwnerEdit(status: ListingStatus): ListingStatus {
  return status === ListingStatus.ACTIVE || status === ListingStatus.INACTIVE
    ? ListingStatus.PENDING_REVIEW
    : status;
}
