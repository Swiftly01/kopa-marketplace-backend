import { Transform } from 'class-transformer';

// trims string input and leaves every other type for the validators to reject
export const Trim = () =>
  Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  );
