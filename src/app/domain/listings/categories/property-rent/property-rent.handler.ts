import { Injectable } from '@nestjs/common';
import { DeepPartial } from 'typeorm';
import { BaseListingCategoryHandler } from '../base-listing-category.handler';
import { FormField } from '../../form-schema/form-schema.types';
import { PropertyRentDetailsDto } from './property-rent-details.dto';
import { PropertyRentDetails } from './property-rent-details.entity';
import {
  PROPERTY_RENT_CATEGORY_CODE,
  PROPERTY_RENT_FORM_VERSION,
} from './property-rent.constants';
import { buildPropertyRentForm } from './property-rent.form';
import { PricePeriod } from './property-rent.enums';

@Injectable()
export class PropertyRentHandler extends BaseListingCategoryHandler<
  PropertyRentDetailsDto,
  PropertyRentDetails
> {
  readonly categoryCode = PROPERTY_RENT_CATEGORY_CODE;
  readonly formVersion = PROPERTY_RENT_FORM_VERSION;
  protected readonly detailsDto = PropertyRentDetailsDto;
  protected readonly detailsEntity = PropertyRentDetails;

  buildFormFields(): FormField[] {
    return buildPropertyRentForm();
  }

  protected toRow(
    listingId: string,
    input: PropertyRentDetailsDto,
  ): DeepPartial<PropertyRentDetails> {
    return {
      listingId,
      address: input.address,
      estateName: input.estateName ?? null,
      propertySize: input.propertySize ?? null,
      propertyType: input.propertyType,
      condition: input.condition,
      furnishing: input.furnishing,
      bedrooms: input.bedrooms,
      bathrooms: input.bathrooms,
      toilets: input.toilets ?? null,
      facilities: input.facilities ?? [],
      listedBy: input.listedBy ?? null,
      serviceCharge: input.serviceCharge ?? false,
      minimumRentalPeriod: input.minimumRentalPeriod,
      pricePeriod: input.pricePeriod ?? PricePeriod.PER_ANNUM,
    };
  }

  protected toView(row: PropertyRentDetails): Record<string, unknown> {
    return {
      address: row.address,
      estateName: row.estateName,
      propertySize: row.propertySize,
      propertyType: row.propertyType,
      condition: row.condition,
      furnishing: row.furnishing,
      bedrooms: row.bedrooms,
      bathrooms: row.bathrooms,
      toilets: row.toilets,
      facilities: row.facilities,
      listedBy: row.listedBy,
      serviceCharge: row.serviceCharge,
      minimumRentalPeriod: row.minimumRentalPeriod,
      pricePeriod: row.pricePeriod,
    };
  }
}
