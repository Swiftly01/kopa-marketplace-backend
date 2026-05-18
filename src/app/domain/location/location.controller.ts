import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Query,
} from '@nestjs/common';
import { LocationService } from './location.service';
import { IsPublic } from '../../auth/decorators/public.decorator';

@IsPublic()
@Controller('location')
export class LocationController {
  constructor(private readonly service: LocationService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  getAllStates() {
    return this.service.getAllStates();
  }

  @Get(':stateCode/lgas')
  @HttpCode(HttpStatus.OK)
  getLGAsByState(@Param('stateCode') stateCode: string) {
    return this.service.getLGAsByState(stateCode);
  }
  // GET STATES
  @Get('states')
  getStates() {
    return this.service.getStates();
  }

  @Get('nigeria/tree')
  getNigeriaTree() {
    return this.service.getNigeriaTree();
  }

  // GET LGAS
  @Get('states/:state/lgas')
  getLgas(@Param('state') state: string) {
    return this.service.getLgasByState(state);
  }

  // SEARCH
  @Get('search')
  search(@Query('q') q: string) {
    return this.service.search(q);
  }

  // GET ONE
  @Get(':code')
  getOne(@Param('code') code: string) {
    return this.service.getByCode(code);
  }
}
