// src/modules/providers/providers.public.controller.ts
import { Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import { ProvidersService } from './providers.service';
import { SearchProvidersDto } from './dto/search-providers.dto';

@Controller('providers')
export class ProvidersPublicController {
  constructor(private readonly service: ProvidersService) {}

  @Get(':userId/public')
  publicProfile(@Param('userId', ParseIntPipe) userId: number) {
    return this.service.getPublicProfileByUserId(userId);
  }

  @Get(':userId/service-types')
  publicServiceTypes(@Param('userId', ParseIntPipe) userId: number) {
    return this.service.getServiceTypesForUser(userId);
  }

  // NUEVO: /providers/search?serviceTypeId=&lat=&lng=&radiusKm=&page=&limit=&sort=
  @Get('search')
  search(@Query() q: SearchProvidersDto) {
    return this.service.searchProviders(q);
  }
}
