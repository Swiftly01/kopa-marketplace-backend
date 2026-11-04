import { ValueTransformer } from 'typeorm';

// Postgres returns decimal columns as text; map to number (null stays null)
export const decimalTransformer: ValueTransformer = {
  to: (value?: number | null) => value,
  from: (value?: string | null) =>
    value === null || value === undefined ? value : Number(value),
};
