import { FamilyHouse } from '../entities/family-house.entity';

// which lodges a caller may touch: one house, or null for every house (super admin)
export interface LodgeScope {
  familyHouseId: string | null;
}

export const ANY_HOUSE: LodgeScope = { familyHouseId: null };

export const scopeOfHouse = (house: FamilyHouse): LodgeScope => ({
  familyHouseId: house.id,
});
