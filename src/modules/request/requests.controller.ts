// src/modules/request/requests.controller.ts
import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  UseGuards,
  Param,
  ParseIntPipe,
  Query,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

import { RequestsService } from './requests.service';
import { CreateRequestDto } from './dto/create-request.dto';
import { OfferDto, AcceptDto } from './dto/transition.dto';
import { RatingsService } from '../ragings/ratings.service';
import { RateRequestDto } from './dto/rate-request.dto';
import { ListRequestsQueryDto } from './dto/list-requests.query.dto';
import { OpenRequestsQueryDto } from './dto/open-requests.query.dto';
import { FeedQueryDto } from './dto/feed.dto';

import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../users/user.entity';

import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiBadRequestResponse,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiParam,
  ApiBody,
  ApiQuery,
} from '@nestjs/swagger';

@ApiTags('requests')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('requests')
export class RequestsController {
  constructor(
    private readonly service: RequestsService,
    private readonly ratings: RatingsService,
  ) { }

  /** Helper: userId desde el token (id o sub) */
  private uid(req: any): number {
    return Number(req?.user?.id ?? req?.user?.sub);
  }

  // ---------- FEED (simple) ----------
  @ApiOperation({ summary: 'Feed de pedidos abiertos cerca (PROVIDER)' })
  @ApiOkResponse({ description: 'Listado con distancia' })
  @UseGuards(RolesGuard)
  @Roles(UserRole.PROVIDER, UserRole.ADMIN)
  @Get('feed')
  feed(@Req() req: any, @Query() q: FeedQueryDto) {
    return this.service.feed(
      { lat: q.lat, lng: q.lng, radiusKm: q.radiusKm ?? 10 },
      this.uid(req)
    );
  }

  // ---------- OPEN (paginado) ----------
  @ApiOperation({ summary: 'Pedidos abiertos cerca con paginación (PROVIDER)' })
  @ApiOkResponse({ description: 'Listado paginado con distancia' })
  @ApiQuery({ name: 'lat', type: Number, required: true })
  @ApiQuery({ name: 'lng', type: Number, required: true })
  @ApiQuery({ name: 'radiusKm', type: Number, required: false, example: 10 })
  @ApiQuery({ name: 'page', type: Number, required: false, example: 1 })
  @ApiQuery({ name: 'limit', type: Number, required: false, example: 20 })
  @UseGuards(RolesGuard)
  @Roles(UserRole.PROVIDER, UserRole.ADMIN)
  @Get('open')
  open(@Req() req: any, @Query() q: OpenRequestsQueryDto) {
    return this.service.open(
      {
        lat: q.lat,
        lng: q.lng,
        radiusKm: q.radiusKm ?? 10,
        page: q.page ?? 1,
        limit: q.limit ?? 20,
      },
      this.uid(req)
    );
  }

  // ---------- CREATE ----------
  @ApiOperation({ summary: 'Crear un request' })
  @ApiBody({ type: CreateRequestDto })
  @ApiCreatedResponse({ description: 'Request creado' })
  @ApiBadRequestResponse({ description: 'Datos inválidos' })
  @ApiUnauthorizedResponse({ description: 'No autenticado' })
  @Post()
  create(@Body() body: CreateRequestDto, @Req() req: any) {
    return this.service.create(body, this.uid(req));
  }

  // ---------- LISTADOS ----------
  @ApiOperation({ summary: 'Mis solicitudes como CLIENT' })
  @ApiOkResponse({ description: 'Listado paginado' })
  @ApiQuery({ name: 'status', required: false, enum: ['PENDING', 'OFFERED', 'ACCEPTED', 'IN_PROGRESS', 'DONE', 'CANCELLED'] })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @Get('me')
  listMine(@Req() req: any, @Query() q: ListRequestsQueryDto) {
    return this.service.listByClient(this.uid(req), q);

  }

  @ApiOperation({ summary: 'Mis solicitudes como PROVIDER' })
  @ApiOkResponse({ description: 'Listado paginado' })
  @ApiQuery({ name: 'status', required: false, enum: ['PENDING', 'OFFERED', 'ACCEPTED', 'IN_PROGRESS', 'DONE', 'CANCELLED'] })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @Get('provider/me')
  listAsProvider(@Req() req: any, @Query() q: ListRequestsQueryDto) {
    return this.service.listByProvider(this.uid(req), q);
  }

  // ---------- GET BY ID ----------
  @ApiOperation({ summary: 'Obtener un request por id' })
  @ApiParam({ name: 'id', type: Number })
  @ApiOkResponse({ description: 'Request encontrado' })
  @ApiNotFoundResponse({ description: 'Request not found' })
  @ApiUnauthorizedResponse({ description: 'No autenticado' })
  @Get(':id')
  get(@Param('id', ParseIntPipe) id: number) {
    return this.service.get(id);
  }

  // ---------- TIMELINE ----------
  @ApiOperation({ summary: 'Ver timeline de un request' })
  @ApiParam({ name: 'id', type: Number })
  @ApiOkResponse({ description: 'Transiciones del request' })
  @ApiNotFoundResponse({ description: 'Request not found' })
  @ApiUnauthorizedResponse({ description: 'No autenticado' })
  @Get(':id/timeline')
  timeline(@Param('id', ParseIntPipe) id: number) {
    return this.service.timeline(id);
  }

  // ---------- CLAIM ----------
  @ApiOperation({ summary: 'Claim (proveedor ofrece tomar el request)' })
  @ApiParam({ name: 'id', type: Number })
  @ApiBody({ type: OfferDto })
  @ApiOkResponse({ description: 'Request ofertado por el proveedor' })
  @ApiBadRequestResponse({ description: 'Only PENDING can be claimed' })
  @ApiForbiddenResponse({ description: 'Rol no permitido o no autorizado' })
  @ApiUnauthorizedResponse({ description: 'No autenticado' })
  @Post(':id/claim')
  @UseGuards(RolesGuard)
  @Roles(UserRole.PROVIDER, UserRole.ADMIN)
  claim(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: OfferDto,
    @Req() req: any,
  ) {
    return this.service.claim(id, this.uid(req), body.priceOffered);
  }

  // ---------- ACCEPT ----------
  @ApiOperation({ summary: 'Accept (cliente acepta la oferta)' })
  @ApiParam({ name: 'id', type: Number })
  @ApiBody({ type: AcceptDto })
  @ApiOkResponse({ description: 'Request aceptado por el cliente' })
  @ApiBadRequestResponse({ description: 'Only OFFERED can be accepted' })
  @ApiForbiddenResponse({ description: 'Not your request' })
  @ApiUnauthorizedResponse({ description: 'No autenticado' })
  @Post(':id/accept')
  @UseGuards(RolesGuard)
  @Roles(UserRole.CLIENT, UserRole.ADMIN)
  accept(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: AcceptDto,
    @Req() req: any,
  ) {
    return this.service.accept(id, this.uid(req), body.priceAgreed);
  }

  // ---------- START ----------
  @ApiOperation({ summary: 'Start (proveedor inicia el trabajo)' })
  @ApiParam({ name: 'id', type: Number })
  @ApiOkResponse({ description: 'Request en progreso' })
  @ApiBadRequestResponse({ description: 'Only ACCEPTED can start' })
  @ApiForbiddenResponse({ description: 'Not your assignment' })
  @ApiUnauthorizedResponse({ description: 'No autenticado' })
  @Post(':id/start')
  @UseGuards(RolesGuard)
  @Roles(UserRole.PROVIDER, UserRole.ADMIN)
  start(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.service.start(id, this.uid(req));
  }

  // ---------- COMPLETE ----------
  @ApiOperation({ summary: 'Complete (proveedor completa el trabajo)' })
  @ApiParam({ name: 'id', type: Number })
  @ApiOkResponse({ description: 'Request completado' })
  @ApiBadRequestResponse({ description: 'Only IN_PROGRESS can be completed' })
  @ApiForbiddenResponse({ description: 'Not your assignment' })
  @ApiUnauthorizedResponse({ description: 'No autenticado' })
  @Post(':id/complete')
  @UseGuards(RolesGuard)
  @Roles(UserRole.PROVIDER, UserRole.ADMIN)
  complete(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.service.complete(id, this.uid(req));
  }

  // ---------- CANCEL ----------
  @ApiOperation({ summary: 'Cancelar (cliente o proveedor del request)' })
  @ApiParam({ name: 'id', type: Number })
  @ApiOkResponse({ description: 'Request cancelado' })
  @ApiBadRequestResponse({ description: 'Cannot cancel DONE' })
  @ApiForbiddenResponse({ description: 'Not allowed' })
  @ApiUnauthorizedResponse({ description: 'No autenticado' })
  @Post(':id/cancel')
  cancel(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.service.cancel(id, this.uid(req));
  }

  // ---------- ADMIN CANCEL ----------
  @ApiOperation({ summary: 'Cancelar como admin (auditable en timeline)' })
  @ApiParam({ name: 'id', type: Number })
  @ApiOkResponse({ description: 'Request cancelado por admin' })
  @ApiUnauthorizedResponse({ description: 'No autenticado' })
  @ApiForbiddenResponse({ description: 'Solo ADMIN' })
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @Post(':id/admin-cancel')
  adminCancel(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.service.adminCancel(id, this.uid(req));
  }

  // ---------- RATE ----------
  @ApiOperation({ summary: 'Calificar trabajo (CLIENT)' })
  @ApiParam({ name: 'id', type: Number })
  @ApiBody({ type: RateRequestDto })
  @ApiOkResponse({ description: 'Rating guardado' })
  @ApiForbiddenResponse({ description: 'Not allowed' })
  @ApiUnauthorizedResponse({ description: 'No autenticado' })
  @Post(':id/rate')
  @UseGuards(RolesGuard)
  @Roles(UserRole.CLIENT, UserRole.ADMIN)
  rate(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: RateRequestDto,
    @Req() req: any,
  ) {
    return this.ratings.rateRequest(id, this.uid(req), body);
  }

  // -------- SUMMARIES --------

  @ApiOperation({ summary: 'Resumen de mis solicitudes (CLIENT)' })
  @ApiOkResponse({
    description: 'Conteo por estado',
    schema: {
      example: { PENDING: 2, OFFERED: 1, ACCEPTED: 0, IN_PROGRESS: 1, DONE: 5, CANCELLED: 1, total: 10 },
    },
  })
  @UseGuards(RolesGuard)
  @Roles(UserRole.CLIENT, UserRole.ADMIN)
  @Get('me/summary')
  mineSummaryAsClient(@Req() req: any) {
    return this.service.mineSummary({ userId: this.uid(req), as: 'client' });
  }

  @ApiOperation({ summary: 'Resumen de mis solicitudes (PROVIDER)' })
  @ApiOkResponse({
    description: 'Conteo por estado',
    schema: {
      example: { PENDING: 0, OFFERED: 3, ACCEPTED: 2, IN_PROGRESS: 1, DONE: 7, CANCELLED: 0, total: 13 },
    },
  })
  @UseGuards(RolesGuard)
  @Roles(UserRole.PROVIDER, UserRole.ADMIN)
  @Get('provider/me/summary')
  mineSummaryAsProvider(@Req() req: any) {
    return this.service.mineSummary({ userId: this.uid(req), as: 'provider' });
  }
}
