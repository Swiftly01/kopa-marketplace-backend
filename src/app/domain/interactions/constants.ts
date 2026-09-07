export const INTERACTION_QUEUE_NAMES = {
  REVIEW_REQUEST: 'interaction.review-request',
};

export const REVIEW_REQUEST_JOB_NAME = 'send-review-request';

export const REVIEW_REQUEST_ENQUEUE_TIMEOUT_MS = 1500;

export const REVIEW_REQUEST_RECONCILE_BATCH_SIZE = 200;

export const REVIEW_REQUEST_DUE_SWEEP_BATCH_SIZE = 200;
export const REVIEW_REQUEST_DUE_SWEEP_MAX_ATTEMPTS = 8;
export const REVIEW_REQUEST_DUE_SWEEP_CLAIM_PREFIX = 'direct-sweep:';

export function buildReviewRequestJobId(
  buyerId: string,
  sellerId: string,
  productId: string,
): string {
  return `review-request_${buyerId}_${sellerId}_${productId}`;
}
