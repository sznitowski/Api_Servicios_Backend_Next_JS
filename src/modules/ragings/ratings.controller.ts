// src/modules/ratings/ratings.controller.ts
import {
  Body, Controller, Get, Param, ParseIntPipe, Post, Query, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiQuery, ApiBearerAuth,
  ApiBody, ApiCreatedResponse, ApiUnauthorizedResponse, ApiBadRequestResponse,
  ApiForbiddenResponse, ApiNotFoundResponse } from '@nestjs/swagger';

import { RatingsService } from './ratings.service';
import { ListDto } from './dto/list.dto';
import { CreateRatingDto } from './dto/create-rating.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user';

/**
 * Lectura pública de ratings por proveedor (mantiene tus rutas bajo /providers).
 */
@ApiTags('providers')
@Controller('providers')
export class RatingsController {
  constructor(private readonly ratings: RatingsService) {}

  // GET /providers/id/:userId/ratings?page=&limit=
  @ApiOperation({ summary: 'Listar calificaciones por proveedor' })
  @ApiParam({ name: 'userId', type: Number })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @Get('id/:userId/ratings')
  list(
    @Param('userId', ParseIntPipe) userId: number,
    @Query() q: ListDto,
  ) {
    return this.ratings.listByProvider(userId, { page: q.page, limit: q.limit });
  }

  // GET /providers/id/:userId/ratings/summary
  @ApiOperation({ summary: 'Resumen de calificaciones por proveedor' })
  @ApiParam({ name: 'userId', type: Number })
  @Get('id/:userId/ratings/summary')
  summary(@Param('userId', ParseIntPipe) userId: number) {
    return this.ratings.summaryForProvider(userId);
  }
}

/**
 * Escritura: crear rating de un request finalizado (cliente autenticado).
 * Ruta: POST /requests/:requestId/rating
 */
@ApiTags('ratings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('requests')
export class RatingsWriterController {
  constructor(private readonly ratings: RatingsService) {}

  @ApiOperation({ summary: 'Calificar un request finalizado (solo cliente)' })
  @ApiParam({ name: 'requestId', type: Number })
  @ApiBody({ type: CreateRatingDto })
  @ApiCreatedResponse({ description: 'Rating creado' })
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
