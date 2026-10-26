/**
 * Server-driven form description.
 *
 * The mobile/web app renders the "Post new ad" screen from this schema instead
 * of hard-coding one screen per category. Adding a category therefore needs NO
 * app release: the backend publishes a new schema and the app renders it.
 *
 * `key` is the path of the value inside the create/update payload, e.g.
 * `title` or `details.bedrooms`.
 */
export type FormFieldType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'url'
  | 'select' // single choice, opens a picker (dropdown)
  | 'multiselect' // multiple choice picker
  | 'radio' // few inline choices (Yes / No / Not sure)
  | 'checkbox' // boolean
  | 'photos' // image gallery picker (uploaded via the images endpoint)
  | 'location'; // state + locality picker (stateCode + lgaName)

export interface FormFieldOption {
  value: string | number;
  label: string;
  /** Shown first in a "Popular" section of the picker. */
  popular?: boolean;
}

export interface FormField {
  key: string;
  label: string;
  type: FormFieldType;
  required: boolean;
  placeholder?: string;
  helperText?: string;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  options?: FormFieldOption[];
  /** Picker should show a "Find ..." search box. */
  searchable?: boolean;
  defaultValue?: string | number | boolean | null;
  /** Photos: minimum needed to publish / maximum allowed. */
  minItems?: number;
  maxItems?: number;
  /** Photos: allowed formats and per-file size limit in MB. */
  accept?: string[];
  maxFileSizeMb?: number;
}

export interface ListingFormSchema {
  category: { id: string; code: string; name: string };
  /** Bump when a category's form changes in a way clients should notice. */
  version: number;
  fields: FormField[];
}
