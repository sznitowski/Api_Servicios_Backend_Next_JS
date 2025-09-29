import {
  Body, Controller, Get, Param, ParseIntPipe, Post, Query, UseGuards,
} from '@nestjs/common';
import {
  ApiTags, ApiOperation, ApiParam, ApiQuery, ApiBearerAuth,
  ApiBody, ApiCreatedResponse, ApiUnauthorizedResponse,
  ApiBadRequestResponse, ApiForbiddenResponse, ApiNotFoundResponse,
} from '@nestjs/swagger';

import { RatingsService } from './ratings.service';
import { CreateRatingDto } from './dto/create-rating.dto';
import { ListProviderRatingsDto } from './dto/list-provider-ratings.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user';

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

/** ESCRITURA (cliente) y LECTURA por request: /requests/... */
@ApiTags('ratings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('requests')
export class RatingsWriterController {
  constructor(private readonly ratings: RatingsService) {}

  // POST /requests/:requestId/rating
  @ApiOperation({ summary: 'Calificar un request finalizado (solo cliente)' })
  @ApiParam({ name: 'requestId', type: Number })
  @ApiBody({ type: CreateRatingDto })
  @ApiCreatedResponse({ description: 'Rating creado/actualizado' })
  @ApiUnauthorizedResponse({ description: 'No autenticado' })
  @ApiBadRequestResponse({ description: 'Estado inválido / duplicado' })
  @ApiForbiddenResponse({ description: 'Solo el cliente puede calificar' })
  @ApiNotFoundResponse({ description: 'Request no encontrado' })
  @Post(':requestId/rating')
  create(
    @Param('requestId', ParseIntPipe) requestId: number,
    @CurrentUser() user: { sub: number },
    @Body() dto: CreateRatingDto,
  ) {
    return this.ratings.rateRequest(requestId, user.sub, dto);
  }
}

@ApiTags('ratings')
@Controller('requests')
export class RatingsReadController {
  constructor(private readonly ratings: RatingsService) {}

  // GET /requests/:requestId/rating
  @ApiOperation({ summary: 'Obtener la calificación de un request (si existe)' })
  @ApiParam({ name: 'requestId', type: Number })
  @Get(':requestId/rating')
  getByRequest(@Param('requestId', ParseIntPipe) requestId: number) {
    return this.ratings.getByRequest(requestId);
  }
}
