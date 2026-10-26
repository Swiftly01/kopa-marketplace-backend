import { FormField, FormFieldOption, FormFieldType } from './form-schema.types';

type FieldExtras = Partial<Omit<FormField, 'key' | 'label' | 'type'>>;

const buildSimple =
  (type: FormFieldType) =>
  (key: string, label: string, extras: FieldExtras = {}): FormField => ({
    key,
    label,
    type,
    required: false,
    ...extras,
  });

const buildPicker =
  (type: 'select' | 'multiselect') =>
  (
    key: string,
    label: string,
    options: FormFieldOption[],
    extras: FieldExtras = {},
  ): FormField => ({
    key,
    label,
    type,
    required: false,
    options,
    ...extras,
  });

// builders for category-specific fields; the shared ones live in core-fields.ts
export const field = {
  text: buildSimple('text'),
  number: buildSimple('number'),
  checkbox: buildSimple('checkbox'),
  select: buildPicker('select'),
  multiselect: buildPicker('multiselect'),
};
