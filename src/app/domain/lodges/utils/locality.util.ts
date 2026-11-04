import { BadRequestException } from '@nestjs/common';
import { LocationService } from '../../location/location.service';

// state and LGA are saved together or not at all; returns canonical names ({} when neither is sent)
export function resolveOptionalLocality(
  locations: LocationService,
  stateCode?: string,
  lgaName?: string,
) {
  if (!stateCode && !lgaName) return {};
  if (!stateCode || !lgaName) {
    throw new BadRequestException(
      'stateCode and lgaName must be sent together',
    );
  }
  return locations.resolveLocality(stateCode, lgaName);
}
