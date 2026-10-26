import { ValueTransformer } from 'typeorm';

/**
 * Postgres returns `bigint` columns as strings. Prices fit comfortably inside
 * Number.MAX_SAFE_INTEGER, so we convert to a number on the way out.
 */
export const bigintTransformer: ValueTransformer = {
  to: (value?: number | null) => value,
  from: (value?: string | null) =>
    value === null || value === undefined ? value : Number(value),
};
