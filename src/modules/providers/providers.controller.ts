// src/modules/providers/providers.controller.ts
import {
  Body,
  Controller,
  Get,
  Patch,
  Put,
  Post,
  Delete,
  Req,
  UseGuards,
  Query,
  Param,
  ParseIntPipe,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ProvidersService } from './providers.service';

// DTOs
import { UpdateProviderProfileDto } from './dto/update-provider-profile.dto';
import { SetServiceTypesDto, ServiceTypeItemDto } from './dto/set-service-types.dto';
import { PaginationQueryDto } from './dto/pagination-query.dto';
import { SearchProvidersDto } from './dto/search-providers.dto';

// Ratings
import { RatingsService } from '../ragings/ratings.service';

// Swagger
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiOkResponse,
  ApiUnauthorizedResponse,
  ApiQuery,
  ApiParam,
  ApiBody,
  ApiCreatedResponse,
} from '@nestjs/swagger';

@ApiTags('providers')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('providers')
export class ProvidersController {
  constructor(
    private readonly service: ProvidersService,
    private readonly ratings: RatingsService,
  ) {}

  /** userId desde el token (id o sub) */
  private uid(req: any): number {
    return Number(req?.user?.id ?? req?.user?.sub);
  }

  // ---------- Perfil ----------
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

  // ---------- Service Types propios ----------
  @ApiOperation({ summary: 'Listar mis tipos de servicio' })
  @ApiQuery({ name: 'active', required: false, type: Boolean, example: true })
  @ApiOkResponse({ description: 'Tipos de servicio del proveedor' })
  @ApiUnauthorizedResponse({ description: 'No autenticado.' })
  @Get('me/service-types')
  myServiceTypes(@Req() req: any, @Query('active') active?: string) {
    const flag =
      typeof active === 'string'
        ? active.toLowerCase() === 'true'
          ? true
          : active.toLowerCase() === 'false'
          ? false
          : undefined
        : undefined;
    return this.service.getMyServiceTypes(this.uid(req), { active: flag });
  }

  @ApiOperation({ summary: 'Establecer TODOS mis tipos (reemplaza)' })
  @ApiBody({ type: SetServiceTypesDto })
  @ApiOkResponse({ description: 'Tipos de servicio actualizados' })
  @ApiUnauthorizedResponse({ description: 'No autenticado.' })
  @Put('me/service-types')
  setMyServiceTypes(@Body() dto: SetServiceTypesDto, @Req() req: any) {
    return this.service.setMyServiceTypes(this.uid(req), dto.items);
  }

  @ApiOperation({ summary: 'Activar/actualizar un tipo de servicio' })
  @ApiBody({ type: ServiceTypeItemDto })
  @ApiCreatedResponse({ description: 'Tipo activado/actualizado' })
  @ApiUnauthorizedResponse({ description: 'No autenticado.' })
  @Post('me/service-types')
  upsertMyServiceType(@Body() dto: ServiceTypeItemDto, @Req() req: any) {
    return this.service.upsertMyServiceType(this.uid(req), dto);
  }

  @ApiOperation({ summary: 'Desactivar un tipo de servicio' })
  @ApiParam({ name: 'serviceTypeId', type: Number })
  @ApiOkResponse({ description: 'Tipo desactivado' })
  @ApiUnauthorizedResponse({ description: 'No autenticado.' })
  @Delete('me/service-types/:serviceTypeId')
  deactivateMyServiceType(
    @Param('serviceTypeId', ParseIntPipe) serviceTypeId: number,
    @Req() req: any,
  ) {
    return this.service.deactivateMyServiceType(this.uid(req), serviceTypeId);
  }

  // ---------- Ratings propios ----------
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

  // ---------- Búsqueda pública ----------
  @ApiOperation({ summary: 'Buscar proveedores por tipo y radio (con filtros)' })
  @ApiOkResponse({ description: 'Listado paginado con distancia y precio base' })
  @ApiQuery({ name: 'serviceTypeId', required: true, type: Number })
  @ApiQuery({ name: 'lat', required: true, type: Number })
  @ApiQuery({ name: 'lng', required: true, type: Number })
  @ApiQuery({ name: 'radiusKm', required: false, type: Number, example: 10 })
  // Filtros nuevos:
  @ApiQuery({ name: 'minRating', required: false, type: Number, example: 4.5 })
  @ApiQuery({ name: 'minReviews', required: false, type: Number, example: 3 })
  @ApiQuery({ name: 'minPrice', required: false, type: Number, example: 15000 })
  @ApiQuery({ name: 'maxPrice', required: false, type: Number, example: 25000 })
  @ApiQuery({ name: 'hasPhoto', required: false, type: Boolean, example: true })
  @ApiQuery({ name: 'q', required: false, type: String, example: 'plomero' })
  // Orden + paginado
  @ApiQuery({
    name: 'sort',
    required: false,
    enum: ['distance', 'rating', 'price'],
    example: 'distance',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @Get('search')
  search(@Query() q: SearchProvidersDto) {
    return this.service.searchProviders(q);
  }

  // ---------- Público por :id ----------
  @ApiOperation({ summary: 'Perfil público del proveedor (por userId)' })
  @ApiParam({ name: 'id', type: Number })
  @ApiOkResponse({ description: 'Perfil público' })
  @Get(':id')
  profileById(@Param('id', ParseIntPipe) id: number) {
    return this.service.getPublicProfileByUserId(id);
  }

  @ApiOperation({ summary: 'Tipos de servicio activos del proveedor (por userId)' })
  @ApiParam({ name: 'id', type: Number })
  @ApiOkResponse({ description: 'Tipos de servicio activos' })
  @Get(':id/service-types')
  serviceTypesById(@Param('id', ParseIntPipe) id: number) {
    return this.service.getServiceTypesForUser(id);
  }

  @ApiOperation({ summary: 'Listar calificaciones por proveedor (por userId)' })
  @ApiParam({ name: 'id', type: Number })
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

  @ApiOperation({ summary: 'Resumen de calificaciones por proveedor (por userId)' })
  @ApiParam({ name: 'id', type: Number })
  @ApiOkResponse({ description: 'Promedio y conteos por estrellas' })
  @Get(':id/ratings/summary')
  ratingsSummaryByProvider(@Param('id', ParseIntPipe) id: number) {
    return this.ratings.summaryForProvider(id);
  }
}
