import { FormFieldOption } from './form-schema.types';

/**
 * Turns a string enum + its label map into picker options.
 *
 * Typing the label map as `Record<Enum, string>` means the compiler fails if a
 * new enum member is added without a label - the enum, the validation and the
 * picker can never drift apart.
 */
export function enumOptions<E extends string>(
  labels: Record<E, string>,
  popular: readonly E[] = [],
): FormFieldOption[] {
  return (Object.keys(labels) as E[]).map((value) => ({
    value,
    label: labels[value],
    ...(popular.includes(value) ? { popular: true } : {}),
  }));
}

// from..to numeric options; popular values come first in the order given, the rest ascend
export function numberOptions(
  from: number,
  to: number,
  popular: readonly number[] = [],
): FormFieldOption[] {
  const toOption = (value: number, isPopular: boolean): FormFieldOption => ({
    value,
    label: String(value),
    ...(isPopular ? { popular: true } : {}),
  });

  const popularOptions = popular
    .filter((value) => value >= from && value <= to)
    .map((value) => toOption(value, true));

  const otherOptions = Array.from({ length: to - from + 1 }, (_, i) => from + i)
    .filter((value) => !popular.includes(value))
    .map((value) => toOption(value, false));

  return [...popularOptions, ...otherOptions];
}
