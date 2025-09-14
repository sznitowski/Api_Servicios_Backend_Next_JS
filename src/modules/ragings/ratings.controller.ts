// src/modules/ratings/ratings.controller.ts
import { Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import { RatingsService } from './ratings.service';
import { ListDto } from './dto/list.dto';
import { ApiTags, ApiOperation, ApiParam, ApiQuery } from '@nestjs/swagger';

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
