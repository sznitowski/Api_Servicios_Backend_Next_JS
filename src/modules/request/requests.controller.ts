// src/modules/request/requests.controller.ts
import {
  Controller,
  Post,
  Body,
  UseGuards,
  Req,
  Get,
  Param,
  ParseIntPipe,
  Query,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

import { RequestsService } from './requests.service';
import { CreateRequestDto } from './dto/create-request.dto';

import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../users/user.entity';

import { OfferDto, AcceptDto } from './dto/transition.dto';
import { FeedQueryDto } from './dto/feed.dto';
import { MineQueryDto } from './dto/mine.dto';
import { MineSummaryDto } from './dto/mine-summary.dto';

// Ratings
// Ratings
import { CreateRatingDto } from '../ragings/dto/create-rating.dto';
import { RatingsService } from '../ragings/ratings.service';
import { CurrentUser } from '../../common/decorators/current-user';
import type { JwtUser } from '../../common/decorators/current-user';

@UseGuards(AuthGuard('jwt'))
@Controller('requests')
export class RequestsController {
  requests: any;
  constructor(
    private readonly service: RequestsService,
    private readonly ratings: RatingsService,
  ) { }

  // -------- FEED (para proveedores) --------
  @Get('feed')
  @UseGuards(RolesGuard)
  @Roles(UserRole.PROVIDER, UserRole.ADMIN)
  feed(@Query() q: FeedQueryDto, @Req() req: any) {
    return this.service.feed(
      { lat: q.lat, lng: q.lng, radiusKm: q.radiusKm ?? 10 },
      req.user.sub,
    );
  }

  // -------- MIS PEDIDOS / MIS ASIGNACIONES --------
  @Get('mine')
  mine(@Query() q: MineQueryDto, @Req() req: any) {
    return this.service.mine({
      userId: req.user.sub,
      as: q.as,
      status: q.status,
      page: q.page,
      limit: q.limit,
    });
  }

  @Get('mine/summary')
  summary(@Query() q: MineSummaryDto, @Req() req: any) {
    return this.service.mineSummary({ userId: req.user.sub, as: q.as });
  }

  // -------- CRUD / ACCIONES --------
  @Post()
  create(@Body() body: CreateRequestDto, @Req() req: any) {
    return this.service.create(body, req.user.sub);
  }

  @Get(':id')
  get(@Param('id', ParseIntPipe) id: number) {
    return this.service.get(id);
  }

  @Get(':id/timeline')
  timeline(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    console.debug('[timeline] user=%s id=%s', req.user?.sub, id);
    return this.service.timeline(id);
  }

  @Post(':id/claim')
  @UseGuards(RolesGuard)
  @Roles(UserRole.PROVIDER, UserRole.ADMIN)
  claim(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: OfferDto,
    @Req() req: any,
  ) {
    return this.service.claim(id, req.user.sub, body.priceOffered);
  }

  @Post(':id/accept')
  @UseGuards(RolesGuard)
  @Roles(UserRole.CLIENT, UserRole.ADMIN)
  accept(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: AcceptDto,
    @Req() req: any,
  ) {
    return this.service.accept(id, req.user.sub, body.priceAgreed);
  }

  @Post(':id/start')
  @UseGuards(RolesGuard)
  @Roles(UserRole.PROVIDER, UserRole.ADMIN)
  start(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.service.start(id, req.user.sub);
  }

  @Post(':id/complete')
  @UseGuards(RolesGuard)
  @Roles(UserRole.PROVIDER, UserRole.ADMIN)
  complete(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.service.complete(id, req.user.sub);
  }

  @Post(':id/cancel')
  cancel(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.service.cancel(id, req.user.sub);
  }

  @Post(':id/admin-cancel')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.ADMIN)
  async adminCancel(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: JwtUser,
  ) {
    return this.service.adminCancel(id, user.sub); // <- antes decía this.requests...
  }



  // -------- RATING (cliente califica al proveedor) --------
  @UseGuards(RolesGuard)
  @Roles(UserRole.CLIENT, UserRole.ADMIN)
  @Post(':id/rate')
  rate(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: CreateRatingDto,
    @Req() req: any,
  ) {
    return this.ratings.rateRequest(id, req.user.sub, body);
  }
}
