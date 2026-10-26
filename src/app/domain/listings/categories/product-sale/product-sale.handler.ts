import { Injectable } from '@nestjs/common';
import { DeepPartial } from 'typeorm';
import { BaseListingCategoryHandler } from '../base-listing-category.handler';
import { FormField } from '../../form-schema/form-schema.types';
import { ProductSaleDetailsDto } from './product-sale-details.dto';
import { ProductSaleDetails } from './product-sale-details.entity';
import {
  PRODUCT_SALE_CATEGORY_CODE,
  PRODUCT_SALE_FORM_VERSION,
} from './product-sale.constants';
import { buildProductSaleForm } from './product-sale.form';

// the fallback handler: serves every postable category that has no form of its own
@Injectable()
export class ProductSaleHandler extends BaseListingCategoryHandler<
  ProductSaleDetailsDto,
  ProductSaleDetails
> {
  readonly categoryCode = PRODUCT_SALE_CATEGORY_CODE;
  readonly formVersion = PRODUCT_SALE_FORM_VERSION;
  readonly isFallback = true;
  protected readonly detailsDto = ProductSaleDetailsDto;
  protected readonly detailsEntity = ProductSaleDetails;

  buildFormFields(): FormField[] {
    return buildProductSaleForm();
  }

  protected toRow(
    listingId: string,
    input: ProductSaleDetailsDto,
  ): DeepPartial<ProductSaleDetails> {
    return {
      listingId,
      condition: input.condition,
      brand: input.brand ?? null,
      quantity: input.quantity ?? 1,
    };
  }

  protected toView(row: ProductSaleDetails): Record<string, unknown> {
    return {
      condition: row.condition,
      brand: row.brand,
      quantity: row.quantity,
    };
  }
}
