// src/modules/providers/providers.controller.ts
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

// DTOs propios
import { UpdateProviderProfileDto } from './dto/update-provider-profile.dto';
import { SetServiceTypesDto } from './dto/set-service-types.dto';
import { PaginationQueryDto } from './dto/pagination-query.dto';
import { SearchProvidersDto } from './dto/search-providers.dto';

// Ratings (mantengo tu path actual)
import { RatingsService } from '../ragings/ratings.service';

// Swagger (opcional)
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiOkResponse,
  ApiUnauthorizedResponse,
  ApiQuery,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';

@ApiTags('providers')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('providers')
export class ProvidersController {
  constructor(
    private readonly service: ProvidersService,
    private readonly ratings: RatingsService,
  ) { }

  /** Obtiene el userId desde el token (id o sub, según tu estrategia JWT). */
  private uid(req: any): number {
    return Number(req?.user?.id ?? req?.user?.sub);
  }

  // ---------- Perfil del proveedor autenticado ----------
  @ApiOperation({ summary: 'Ver mi perfil de proveedor' })
  @ApiOkResponse({ description: 'Perfil actual del proveedor' })
  @ApiUnauthorizedResponse({ description: 'No autenticado.' })
  @Get('me')
  me(@Req() req: any) {
    return this.service.getMyProfile(this.uid(req));
  }

  @ApiOperation({ summary: 'Actualizar mi perfil de proveedor' })
  @ApiBody({ type: UpdateProviderProfileDto })
  @ApiOkResponse({ description: 'Perfil actualizado' })
  @ApiUnauthorizedResponse({ description: 'No autenticado.' })
  @Patch('me')
  updateMe(@Body() dto: UpdateProviderProfileDto, @Req() req: any) {
    return this.service.updateMyProfile(this.uid(req), dto);
  }

  // ---------- Service Types del proveedor ----------
  @ApiOperation({ summary: 'Listar mis tipos de servicio' })
  @ApiOkResponse({ description: 'Tipos de servicio del proveedor' })
  @ApiUnauthorizedResponse({ description: 'No autenticado.' })
  @Get('me/service-types')
  myServiceTypes(@Req() req: any) {
    return this.service.getMyServiceTypes(this.uid(req));
  }

  @ApiOperation({ summary: 'Establecer mis tipos de servicio' })
  @ApiBody({
    description: 'Lista completa a establecer (reemplaza los actuales)',
    type: SetServiceTypesDto,
  })
  @ApiOkResponse({ description: 'Tipos de servicio actualizados' })
  @ApiUnauthorizedResponse({ description: 'No autenticado.' })
  @Put('me/service-types')
  setMyServiceTypes(@Body() dto: SetServiceTypesDto, @Req() req: any) {
    return this.service.setMyServiceTypes(this.uid(req), dto.items);
  }

  // ---------- Ratings del proveedor autenticado ----------
  @ApiOperation({ summary: 'Listar mis calificaciones' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 5 })
  @ApiOkResponse({ description: 'Listado paginado de ratings' })
  @ApiUnauthorizedResponse({ description: 'No autenticado.' })
  @Get('me/ratings')
  myRatings(@Req() req: any, @Query() q: PaginationQueryDto) {
    return this.ratings.listByProvider(this.uid(req), {
      page: q.page ?? 1,
      limit: q.limit ?? 5,
    });
  }

  @ApiOperation({ summary: 'Resumen de mis calificaciones' })
  @ApiOkResponse({ description: 'Promedio y conteos por estrellas' })
  @ApiUnauthorizedResponse({ description: 'No autenticado.' })
  @Get('me/ratings/summary')
  myRatingsSummary(@Req() req: any) {
    return this.ratings.summaryForProvider(this.uid(req));
  }

  // ---------- Búsqueda (ruta fija, va ANTES de cualquier :id) ----------
  @ApiOperation({ summary: 'Buscar proveedores por tipo y radio' })
  @ApiOkResponse({ description: 'Listado paginado con distancia y precio base' })
  @ApiQuery({ name: 'serviceTypeId', required: true, type: Number })
  @ApiQuery({ name: 'lat', required: true, type: Number })
  @ApiQuery({ name: 'lng', required: true, type: Number })
  @ApiQuery({ name: 'radiusKm', required: false, type: Number, example: 10 })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiQuery({
    name: 'sort',
    required: false,
    enum: ['distance', 'rating', 'price'],
    example: 'distance',
  })
  @Get('search')
  search(@Query() q: SearchProvidersDto) {
    return this.service.searchProviders(q);
  }

  // ---------- Público por :id (van DESPUÉS de /search para evitar colisiones) ----------
  @ApiOperation({ summary: 'Perfil público del proveedor (por userId)' })
  @ApiParam({ name: 'id', type: Number, description: 'UserId del proveedor' })
  @Get(':id')
  profileById(@Param('id', ParseIntPipe) id: number) {
    return this.service.getPublicProfileByUserId(id);
  }

  @ApiOperation({ summary: 'Tipos de servicio activos del proveedor (por userId)' })
  @ApiParam({ name: 'id', type: Number, description: 'UserId del proveedor' })
  @Get(':id/service-types')
  serviceTypesById(@Param('id', ParseIntPipe) id: number) {
    return this.service.getServiceTypesForUser(id);
  }

  @ApiOperation({ summary: 'Listar calificaciones por proveedor (por id)' })
  @ApiParam({ name: 'id', type: Number, description: 'UserId del proveedor' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiOkResponse({ description: 'Listado paginado de ratings' })
  @Get(':id/ratings')
  ratingsByProvider(
    @Param('id', ParseIntPipe) id: number,
    @Query() q: PaginationQueryDto,
  ) {
    return this.ratings.listByProvider(id, {
      page: q.page ?? 1,
      limit: q.limit ?? 10,
    });
  }

  @ApiOperation({ summary: 'Resumen de calificaciones por proveedor (por id)' })
  @ApiParam({ name: 'id', type: Number, description: 'UserId del proveedor' })
  @ApiOkResponse({ description: 'Promedio y conteos por estrellas' })
  @Get(':id/ratings/summary')
  ratingsSummaryByProvider(@Param('id', ParseIntPipe) id: number) {
    return this.ratings.summaryForProvider(id);
  }
}
