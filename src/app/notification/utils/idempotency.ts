import { createHash } from 'crypto';

interface DeriveIdempotencyInput {
  userId: string;
  type: string;
  body: string;
  data?: Record<string, unknown>;
}

export function deriveIdempotencyKey(input: DeriveIdempotencyInput): string {
  const hash = createHash('sha256');
  hash.update(input.userId);
  hash.update(input.type);
  hash.update(input.body);

  if (input.data) {
    hash.update(JSON.stringify(sortKeys(input.data)));
  }

  return hash.digest('hex');
}

function sortKeys(obj: Record<string, unknown>) {
  return Object.keys(obj)
    .sort()
    .reduce<Record<string, unknown>>((acc, key) => {
      acc[key] = obj[key];
      return acc;
    }, {});
}
