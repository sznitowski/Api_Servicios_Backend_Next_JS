import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
  ApiBody,
  ApiCreatedResponse,
  ApiUnauthorizedResponse,
  ApiBadRequestResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
} from '@nestjs/swagger';

import { RatingsService } from './ratings.service';
import { CreateRatingDto } from './dto/create-rating.dto';
import { ListProviderRatingsDto } from './dto/list-provider-ratings.dto';

import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user';
import { UserRole } from '../users/user.entity';

/** LECTURA por proveedor: /providers/... */
@ApiTags('providers')
@Controller('providers')
export class RatingsController {
  constructor(private readonly ratings: RatingsService) {}

  // GET /providers/id/:userId/ratings?page=&limit=&requestId=
  @ApiOperation({ summary: 'Listar calificaciones por proveedor' })
  @ApiParam({ name: 'userId', type: Number })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'requestId', required: false, type: Number })
  @Get('id/:userId/ratings')
  list(
    @Param('userId', ParseIntPipe) userId: number,
    @Query() q: ListProviderRatingsDto,
  ) {
    return this.ratings.listByProvider(userId, {
      page: q.page,
      limit: q.limit,
      requestId: q.requestId,
    });
  }

  // GET /providers/id/:userId/ratings/summary
  @ApiOperation({ summary: 'Resumen de calificaciones por proveedor' })
  @ApiParam({ name: 'userId', type: Number })
  @Get('id/:userId/ratings/summary')
  summary(@Param('userId', ParseIntPipe) userId: number) {
    return this.ratings.summaryForProvider(userId);
  }
}

/** ESCRITURA (cliente o proveedor) y LECTURA por request: /requests/... */
@ApiTags('ratings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('requests')
export class RatingsWriterController {
  constructor(private readonly ratings: RatingsService) {}

  // POST /requests/:requestId/rating  (cliente → proveedor por default)
  // Permite target=client para proveedor → cliente
  @ApiOperation({ summary: 'Crear/actualizar calificación de un request' })
  @ApiParam({ name: 'requestId', type: Number })
  @ApiQuery({
    name: 'target',
    required: false,
    description: "Si 'client', califica el proveedor al cliente; default: cliente al proveedor",
    enum: ['client'],
  })
  @ApiBody({ type: CreateRatingDto })
  @ApiCreatedResponse({ description: 'Rating creado/actualizado' })
  @ApiUnauthorizedResponse({ description: 'No autenticado' })
  @ApiBadRequestResponse({ description: 'Estado inválido / duplicado' })
  @ApiForbiddenResponse({ description: 'Rol no permitido' })
  @ApiNotFoundResponse({ description: 'Request no encontrado' })
  @Roles(UserRole.CLIENT, UserRole.PROVIDER, UserRole.ADMIN)
  @Post(':requestId/rating')
  createOrUpdate(
    @Param('requestId', ParseIntPipe) requestId: number,
    @CurrentUser() user: { sub: number; role: UserRole },
    @Body() dto: CreateRatingDto,
    @Query('target') target?: 'client',
  ) {
    if (target === 'client') {
      // proveedor → cliente
      if (user.role !== UserRole.PROVIDER && user.role !== UserRole.ADMIN) {
        throw new ForbiddenException('Only provider can rate the client');
      }
      return this.ratings.rateClient(requestId, user.sub, dto);
    }

    // cliente → proveedor (default)
    if (user.role !== UserRole.CLIENT && user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Only client can rate the provider');
    }
    return this.ratings.rateRequest(requestId, user.sub, dto);
  }

  // Alias que usa tu UI primero: POST /requests/:requestId/rating/client
  @ApiOperation({ summary: 'Alias: proveedor califica al cliente' })
  @ApiParam({ name: 'requestId', type: Number })
  @ApiBody({ type: CreateRatingDto })
  @Roles(UserRole.PROVIDER, UserRole.ADMIN)
  @Post(':requestId/rating/client')
  createForClient(
    @Param('requestId', ParseIntPipe) requestId: number,
    @CurrentUser() user: { sub: number },
    @Body() dto: CreateRatingDto,
  ) {
    return this.ratings.rateClient(requestId, user.sub, dto);
  }
}

@ApiTags('ratings')
@Controller('requests')
export class RatingsReadController {
  constructor(private readonly ratings: RatingsService) {}

  // GET /requests/:requestId/rating  (default: cliente→proveedor)
  // Soporta ?target=client para proveedor→cliente
  @ApiOperation({ summary: 'Obtener la calificación de un request' })
  @ApiParam({ name: 'requestId', type: Number })
  @ApiQuery({
    name: 'target',
    required: false,
    description: "Si 'client', devuelve la calificación del proveedor al cliente",
    enum: ['client'],
  })
  @Get(':requestId/rating')
  getByRequest(
    @Param('requestId', ParseIntPipe) requestId: number,
    @Query('target') target?: 'client',
  ) {
    if (target === 'client') {
      return this.ratings.getClientRatingByRequest(requestId);
    }
    return this.ratings.getByRequest(requestId);
  }

  // Alias que usa tu UI: GET /requests/:requestId/rating/client
  @ApiOperation({ summary: 'Alias: obtener calificación proveedor→cliente' })
  @ApiParam({ name: 'requestId', type: Number })
  @Get(':requestId/rating/client')
  getClientRatingAlias(@Param('requestId', ParseIntPipe) requestId: number) {
    return this.ratings.getClientRatingByRequest(requestId);
  }
}
