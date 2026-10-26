export enum ListingStatus {
  /** Being created. Not visible to anyone but the owner. */
  DRAFT = 'draft',
  /** Submitted by the owner and waiting for an admin decision. */
  PENDING_REVIEW = 'pending_review',
  /** Approved by an admin: visible in browse/search. */
  ACTIVE = 'active',
  /** An admin turned it down; the owner sees the reason and can fix and resubmit. */
  REJECTED = 'rejected',
  /** Owner paused it (e.g. already let). Hidden but recoverable. */
  INACTIVE = 'inactive',
  /** Soft-deleted by the owner. */
  REMOVED = 'removed',
}
