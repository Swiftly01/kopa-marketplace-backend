import { coreFields } from '../../form-schema/core-fields';
import { field } from '../../form-schema/field-builders';
import { FormField } from '../../form-schema/form-schema.types';
import { enumOptions } from '../../form-schema/option.utils';
import { BRAND_MAX_LENGTH, MAX_QUANTITY } from './product-sale.constants';
import { PRODUCT_CONDITION_LABELS } from './product-sale.enums';

// the form every ordinary "item for sale" category uses
export function buildProductSaleForm(): FormField[] {
  return [
    coreFields.title(),
    coreFields.photos(),
    coreFields.videoUrl(),
    coreFields.location('Item locality'),
    field.select(
      'details.condition',
      'Condition',
      enumOptions(PRODUCT_CONDITION_LABELS),
      { required: true },
    ),
    field.text('details.brand', 'Brand', { maxLength: BRAND_MAX_LENGTH }),
    field.number('details.quantity', 'Quantity available', {
      min: 1,
      max: MAX_QUANTITY,
      defaultValue: 1,
    }),
    coreFields.description(),
    coreFields.price(),
    coreFields.negotiable(),
  ];
}
