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
  BadRequestException,
  Headers,
} from '@nestjs/common';

import { RequestsService } from './requests.service';
import { CreateRequestDto } from './dto/create-request.dto';
import { OfferDto, AcceptDto } from './dto/transition.dto';
import { RatingsService } from '../ragings/ratings.service';
import { RateRequestDto } from './dto/rate-request.dto';
import { CreateRatingDto } from '../ragings/dto/create-rating.dto';
import { ListRequestsQueryDto } from './dto/list-requests.query.dto';
import { OpenRequestsQueryDto } from './dto/open-requests.query.dto';
import { FeedQueryDto } from './dto/feed.dto';
import { MineQueryDto } from './dto/mine.dto';
import { CancelRequestDto } from './dto/cancel-request.dto';

import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
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
  ApiHeader,
} from '@nestjs/swagger';

@ApiTags('requests')
@ApiBearerAuth()
// Todas las rutas requieren JWT
@UseGuards(JwtAuthGuard)
@Controller('requests')
export class RequestsController {
  constructor(
    private readonly service: RequestsService,
    private readonly ratings: RatingsService,
  ) {}

  // Helper: toma userId desde el token (algunos tokens usan `id`, otros `sub`)
  private uid(req: any): number {
    return Number(req?.user?.id ?? req?.user?.sub);
  }

  // ===========================================================================
  // FEED Y ABIERTOS (para proveedores)
  // ===========================================================================

  /** GET /requests/feed — feed simple (hasta 50), ordenado por distancia */
  @ApiOperation({ summary: 'Feed de pedidos abiertos cerca (PROVIDER)' })
  @ApiOkResponse({ description: 'Listado con distancia' })
  @UseGuards(RolesGuard)
  @Roles(UserRole.PROVIDER, UserRole.ADMIN)
  @Get('feed')
  feed(@Req() req: any, @Query() q: FeedQueryDto) {
    const latN = parseFloat(String(q.lat).replace(',', '.'));
    const lngN = parseFloat(String(q.lng).replace(',', '.'));
    const rKmN =
      parseFloat(String(q.radiusKm ?? 10).toString().replace(',', '.')) || 10;
    if (Number.isNaN(latN) || Number.isNaN(lngN)) {
      throw new BadRequestException('lat/lng inválidos');
    }
    return this.service.feed({ lat: latN, lng: lngN, radiusKm: rKmN }, this.uid(req));
  }

  /** GET /requests/open — feed paginado con filtros y sort */
  @ApiOperation({ summary: 'Pedidos abiertos cerca con paginación (PROVIDER)' })
  @ApiOkResponse({ description: 'Listado paginado con distancia' })
  @ApiQuery({ name: 'lat', type: Number, required: true })
  @ApiQuery({ name: 'lng', type: Number, required: true })
  @ApiQuery({ name: 'radiusKm', type: Number, required: false, example: 10 })
  @ApiQuery({ name: 'page', type: Number, required: false, example: 1 })
  @ApiQuery({ name: 'limit', type: Number, required: false, example: 20 })
  @ApiQuery({ name: 'serviceTypeId', type: Number, required: false })
  @ApiQuery({
    name: 'sort',
    required: false,
    enum: ['distance', 'createdAt'],
    example: 'distance',
  })
  @UseGuards(RolesGuard)
  @Roles(UserRole.PROVIDER, UserRole.ADMIN)
  @Get('open')
  open(@Req() req: any, @Query() q: OpenRequestsQueryDto) {
    if (q.lat == null || q.lng == null) {
      throw new BadRequestException('lat y lng son requeridos');
    }

    const latN = parseFloat(String(q.lat).replace(',', '.'));
    const lngN = parseFloat(String(q.lng).replace(',', '.'));
    const rKmN =
      q.radiusKm != null
        ? parseFloat(String(q.radiusKm).replace(',', '.'))
        : 10;

    if (Number.isNaN(latN) || Number.isNaN(lngN)) {
      throw new BadRequestException('lat/lng inválidos');
    }

    return this.service.open(
      {
        lat: latN,
        lng: lngN,
        radiusKm: rKmN,
        page: Math.max(1, Number(q.page ?? 1)),
        limit: Math.max(1, Math.min(Number(q.limit ?? 20), 50)),
        serviceTypeId:
          q.serviceTypeId != null ? Number(q.serviceTypeId) : undefined,
        sort: q.sort, // 'distance' | 'createdAt'
      },
      this.uid(req),
    );
  }

  // ===========================================================================
  // CREAR
  // ===========================================================================

  /**
   * POST /requests — crea un request PENDING del cliente autenticado.
   * **Nuevo**: soporta Idempotency-Key para no “spamear” pedidos.
   * - Si viene el header `Idempotency-Key` o `X-Idempotency-Key`,
   *   se reutiliza el mismo request ante reintentos.
   */
  @ApiOperation({ summary: 'Crear un request (idempotente con Idempotency-Key)' })
  @ApiBody({ type: CreateRequestDto })
  @ApiCreatedResponse({
    description: 'Request creado (o existente si reintento idempotente)',
  })
  @ApiBadRequestResponse({ description: 'Datos inválidos' })
  @ApiUnauthorizedResponse({ description: 'No autenticado' })
  @ApiHeader({
    name: 'Idempotency-Key',
    required: false,
    description: 'Clave para reintentos seguros',
  })
  @ApiHeader({
    name: 'X-Idempotency-Key',
    required: false,
    description: 'Alias del header anterior',
  })
  @Post()
  create(
    @Body() body: CreateRequestDto,
    @Req() req: any,
    @Headers() headers: Record<string, string | undefined>,
  ) {
    const key =
      headers?.['idempotency-key'] ??
      (headers?.['Idempotency-Key'] as any) ??
      headers?.['x-idempotency-key'] ??
      (headers?.['X-Idempotency-Key'] as any);

    return this.service.createIdempotent(body, this.uid(req), key || undefined);
  }

  // ===========================================================================
  // MIS SOLICITUDES (3 variantes: unificada y legacy por rol)
  // ===========================================================================

  @ApiOperation({ summary: 'Mis solicitudes (unificado, CLIENT o PROVIDER)' })
  @ApiOkResponse({ description: 'Listado paginado' })
  @ApiQuery({ name: 'as', required: false, enum: ['client', 'provider'] })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['PENDING', 'OFFERED', 'ACCEPTED', 'IN_PROGRESS', 'DONE', 'CANCELLED'],
  })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @Get('mine')
  listMineUnified(@Req() req: any, @Query() q: MineQueryDto) {
    const role: UserRole = req?.user?.role ?? UserRole.CLIENT;
    return this.service.listMineByRole(this.uid(req), role, q);
  }

  /** LEGACY: como CLIENT */
  @ApiOperation({ summary: 'Mis solicitudes como CLIENT (LEGACY)' })
  @ApiOkResponse({ description: 'Listado paginado' })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['PENDING', 'OFFERED', 'ACCEPTED', 'IN_PROGRESS', 'DONE', 'CANCELLED'],
  })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @Get('me')
  listMine(@Req() req: any, @Query() q: ListRequestsQueryDto) {
    return this.service.listByClient(this.uid(req), q);
  }

  /** LEGACY: como PROVIDER */
  @ApiOperation({ summary: 'Mis solicitudes como PROVIDER (LEGACY)' })
  @ApiOkResponse({ description: 'Listado paginado' })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['PENDING', 'OFFERED', 'ACCEPTED', 'IN_PROGRESS', 'DONE', 'CANCELLED'],
  })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @Get('provider/me')
  listAsProvider(@Req() req: any, @Query() q: ListRequestsQueryDto) {
    return this.service.listByProvider(this.uid(req), q);
  }

  // ===========================================================================
  // GET Y TIMELINE
  // ===========================================================================

  @ApiOperation({ summary: 'Obtener un request por id' })
  @ApiParam({ name: 'id', type: Number })
  @ApiOkResponse({ description: 'Request encontrado' })
  @ApiNotFoundResponse({ description: 'Request not found' })
  @ApiUnauthorizedResponse({ description: 'No autenticado' })
  @Get(':id')
  get(@Param('id', ParseIntPipe) id: number) {
    return this.service.get(id);
  }

  @ApiOperation({ summary: 'Ver timeline de un request' })
  @ApiParam({ name: 'id', type: Number })
  @ApiOkResponse({ description: 'Transiciones del request' })
  @ApiNotFoundResponse({ description: 'Request not found' })
  @ApiUnauthorizedResponse({ description: 'No autenticado' })
  @Get(':id/timeline')
  timeline(@Param('id', ParseIntPipe) id: number) {
    return this.service.timeline(id);
  }

  // ===========================================================================
  // TRANSICIONES
  // ===========================================================================

  /** POST /:id/claim — proveedor ofrece tomar el pedido (pasa a OFFERED) */
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

  /** POST /:id/accept — cliente acepta la oferta (pasa a ACCEPTED) */
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

  /** POST /:id/start — proveedor inicia el trabajo (pasa a IN_PROGRESS) */
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

  /** POST /:id/complete — proveedor completa (pasa a DONE) */
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

  /** Alias: POST /:id/done — igual a /:id/complete */
  @ApiOperation({ summary: 'Done (alias de /:id/complete)' })
  @ApiParam({ name: 'id', type: Number })
  @ApiOkResponse({ description: 'Request completado' })
  @ApiBadRequestResponse({ description: 'Only IN_PROGRESS can be completed' })
  @ApiForbiddenResponse({ description: 'Not your assignment' })
  @ApiUnauthorizedResponse({ description: 'No autenticado' })
  @Post(':id/done')
  @UseGuards(RolesGuard)
  @Roles(UserRole.PROVIDER, UserRole.ADMIN)
  doneAlias(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.service.complete(id, this.uid(req));
  }

  /** POST /:id/cancel — cancelar según rol (cliente/proveedor) */
  @ApiOperation({ summary: 'Cancelar (cliente o proveedor del request)' })
  @ApiParam({ name: 'id', type: Number })
  @ApiBody({ type: CancelRequestDto })
  @ApiOkResponse({ description: 'Request cancelado' })
  @ApiBadRequestResponse({ description: 'Estado no cancelable o DONE' })
  @ApiForbiddenResponse({ description: 'Not allowed' })
  @ApiUnauthorizedResponse({ description: 'No autenticado' })
  @UseGuards(RolesGuard)
  @Roles(UserRole.CLIENT, UserRole.PROVIDER) // Admin tiene endpoint aparte
  @Post(':id/cancel')
  cancel(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: CancelRequestDto,
    @Req() req: any,
  ) {
    const role: UserRole = req?.user?.role ?? UserRole.CLIENT;
    return this.service.cancel(id, this.uid(req), role, body);
  }

  /** POST /:id/admin-cancel — cancelar como admin (auditable) */
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

  // ===========================================================================
  // RATING
  // ===========================================================================

  /** POST /:id/rate — calificar trabajo (CLIENT) */
  @ApiOperation({ summary: 'Calificar trabajo (CLIENT)' })
  @ApiParam({ name: 'id', type: Number })
  @ApiBody({ type: RateRequestDto })
  @ApiOkResponse({ description: 'Rating guardado' })
  @ApiForbiddenResponse({ description: 'Not allowed' })
  @ApiUnauthorizedResponse({ description: 'No autenticado' })
  @UseGuards(RolesGuard)
  @Roles(UserRole.CLIENT, UserRole.ADMIN)
  @Post(':id/rate')
  rate(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: CreateRatingDto,
    @Req() req: any,
  ) {
    return this.ratings.rateRequest(id, this.uid(req), body);
  }

  /** Alias para /:id/rate */
  @ApiOperation({ summary: 'Calificar trabajo (alias de /:id/rate)' })
  @ApiBody({ type: CreateRatingDto })
  @UseGuards(RolesGuard)
  @Roles(UserRole.CLIENT, UserRole.ADMIN)
  @Post(':id/rating')
  rateAlias(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: CreateRatingDto,
    @Req() req: any,
  ) {
    return this.ratings.rateRequest(id, this.uid(req), body);
  }

  // ===========================================================================
  // RESÚMENES
  // ===========================================================================

  /** GET /requests/me/summary — resumen por estado (CLIENT) */
  @ApiOperation({ summary: 'Resumen de mis solicitudes (CLIENT)' })
  @ApiOkResponse({
    description: 'Conteo por estado',
    schema: {
      example: {
        PENDING: 2,
        OFFERED: 1,
        ACCEPTED: 0,
        IN_PROGRESS: 1,
        DONE: 5,
        CANCELLED: 1,
        total: 10,
      },
    },
  })
  @UseGuards(RolesGuard)
  @Roles(UserRole.CLIENT, UserRole.ADMIN)
  @Get('me/summary')
  mineSummaryAsClient(@Req() req: any) {
    return this.service.mineSummary({ userId: this.uid(req), as: 'client' });
  }

  /** GET /requests/provider/me/summary — resumen por estado (PROVIDER) */
  @ApiOperation({ summary: 'Resumen de mis solicitudes (PROVIDER)' })
  @ApiOkResponse({
    description: 'Conteo por estado',
    schema: {
      example: {
        PENDING: 0,
        OFFERED: 3,
        ACCEPTED: 2,
        IN_PROGRESS: 1,
        DONE: 7,
        CANCELLED: 0,
        total: 13,
      },
    },
  })
  @UseGuards(RolesGuard)
  @Roles(UserRole.PROVIDER, UserRole.ADMIN)
  @Get('provider/me/summary')
  mineSummaryAsProvider(@Req() req: any) {
    return this.service.mineSummary({ userId: this.uid(req), as: 'provider' });
  }

  @ApiOperation({ summary: 'Alias: Ofertar (igual a /:id/claim)' })
  @ApiParam({ name: 'id', type: Number })
  @ApiBody({ type: OfferDto })
  @UseGuards(RolesGuard)
  @Roles(UserRole.PROVIDER, UserRole.ADMIN)
  @Post(':id/offer')
  offerAlias(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: OfferDto,
    @Req() req: any,
  ) {
    return this.service.claim(id, this.uid(req), body.priceOffered);
  }

  // GET /requests?nearLat=&nearLng=&radiusKm=  → redirige a open()
  @ApiOperation({ summary: 'Alias de open(): feed simple por lat/lng (PROVIDER)' })
  @UseGuards(RolesGuard)
  @Roles(UserRole.PROVIDER, UserRole.ADMIN)
  @Get()
  listAlias(
    @Req() req: any,
    @Query()
    q: {
      nearLat?: string;
      nearLng?: string;
      radiusKm?: string;
      page?: string;
      limit?: string;
    },
  ) {
    if (q?.nearLat == null || q?.nearLng == null) {
      throw new BadRequestException('nearLat y nearLng son requeridos');
    }
    const latN = parseFloat(String(q.nearLat).replace(',', '.'));
    const lngN = parseFloat(String(q.nearLng).replace(',', '.'));
    const rKmN = q.radiusKm
      ? parseFloat(String(q.radiusKm).replace(',', '.'))
      : 10;
    if (Number.isNaN(latN) || Number.isNaN(lngN)) {
      throw new BadRequestException('nearLat/nearLng inválidos');
    }
    return this.service.open(
      {
        lat: latN,
        lng: lngN,
        radiusKm: rKmN,
        page: q.page ? Number(q.page) : 1,
        limit: q.limit ? Number(q.limit) : 20,
      },
      this.uid(req),
    );
  }
}
