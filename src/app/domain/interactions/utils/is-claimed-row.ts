import { ClaimedRow } from '../services/review-request-due-sweeper.service';

export function isClaimedRow(value: unknown): value is ClaimedRow {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const row = value as Record<string, unknown>;

  return (
    typeof row.id === 'string' &&
    typeof row.buyer_id === 'string' &&
    typeof row.seller_id === 'string' &&
    typeof row.product_id === 'string' &&
    typeof row.review_request_attempts === 'number'
  );
}
