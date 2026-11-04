import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';
import { FamilyHouse } from '../entities/family-house.entity';

export type RequestWithFamilyHouse = Request & { familyHouse: FamilyHouse };

// the house resolved by FamilyHouseAdminGuard; never read from client input
export const CurrentFamilyHouse = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): FamilyHouse =>
    ctx.switchToHttp().getRequest<RequestWithFamilyHouse>().familyHouse,
);
