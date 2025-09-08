import {
  Body,
  Controller,
  Get,
  Patch,
  Put,
  Req,
  UseGuards,
  Query,
  Param,
  ParseIntPipe,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ProvidersService } from './providers.service';
import { UpdateProviderProfileDto } from './dto/update-provider-profile.dto';
import { SetServiceTypesDto } from './dto/set-service-types.dto';
import { RatingsService } from '../ragings/ratings.service'; // <- importa el servicio

@UseGuards(AuthGuard('jwt'))
@Controller('providers')
export class ProvidersController {
  constructor(
    private readonly service: ProvidersService,
    private readonly ratings: RatingsService, // <- inyéctalo
  ) {}

  @Get('me')
  me(@Req() req: any) {
    return this.service.getMyProfile(req.user.sub);
  }

  @Patch('me')
  updateMe(@Body() dto: UpdateProviderProfileDto, @Req() req: any) {
    return this.service.updateMyProfile(req.user.sub, dto);
  }

  @Get('me/service-types')
  myServiceTypes(@Req() req: any) {
    return this.service.getMyServiceTypes(req.user.sub);
  }

  @Put('me/service-types')
  setMyServiceTypes(@Body() dto: SetServiceTypesDto, @Req() req: any) {
    return this.service.setMyServiceTypes(req.user.sub, dto.items);
  }

  // ---------- Ratings del proveedor autenticado ----------
  @Get('me/ratings')
  myRatings(
    @Req() req: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.ratings.listByProvider(req.user.sub, {
      page: Number(page ?? 1),
      limit: Number(limit ?? 10),
    });
  }

  @Get('me/ratings/summary')
  myRatingsSummary(@Req() req: any) {
    return this.ratings.summaryForProvider(req.user.sub);
  }

  // ---------- (Opcional) Ratings por id de usuario proveedor ----------
  @Get(':id/ratings')
  ratingsByProvider(
    @Param('id', ParseIntPipe) id: number,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.ratings.listByProvider(id, {
      page: Number(page ?? 1),
      limit: Number(limit ?? 10),
    });
  }

  @Get(':id/ratings/summary')
  ratingsSummaryByProvider(@Param('id', ParseIntPipe) id: number) {
    return this.ratings.summaryForProvider(id);
  }
}
