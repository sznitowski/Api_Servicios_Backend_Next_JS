import { Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import { RatingsService } from './ratings.service';
import { ListDto } from './dto/list.dto';

@Controller('providers')
export class RatingsController {
  constructor(private readonly ratings: RatingsService) {}

  // GET /providers/:userId/ratings?page=&limit=
  @Get(':userId/ratings')
  list(
    @Param('userId', ParseIntPipe) userId: number,
    @Query() q: ListDto,
  ) {
    return this.ratings.listByProvider(userId, { page: q.page, limit: q.limit });
  }

  // GET /providers/:userId/ratings/summary
  @Get(':userId/ratings/summary')
  summary(@Param('userId', ParseIntPipe) userId: number) {
    return this.ratings.summaryForProvider(userId);
  }
}
