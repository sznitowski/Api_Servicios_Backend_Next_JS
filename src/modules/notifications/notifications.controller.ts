import {
  Controller, Get, Post, Param, ParseIntPipe, Query, Req, UseGuards, Sse,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { NotificationsService } from './notifications.service';
import { ListNotificationsDto } from './dto/list-notifications.dto';
import {
  ApiBearerAuth, ApiOkResponse, ApiOperation, ApiParam, ApiTags, ApiQuery,
} from '@nestjs/swagger';
import { NotificationStreamService } from './notification-stream.service';
import { map, merge, interval } from 'rxjs';

@ApiTags('notifications')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('notifications')
export class NotificationsController {
  constructor(
    private readonly service: NotificationsService,
    private readonly streams: NotificationStreamService,
  ) {}

  // Helper: userId desde el token (id o sub)
  private uid(req: any): number {
    return Number(req?.user?.id ?? req?.user?.sub);
  }

  // GET /notifications/me?unseen=true&page=1&limit=20
  @ApiOperation({ summary: 'Listar mis notificaciones' })
  @ApiOkResponse({ description: 'Listado paginado' })
  @ApiQuery({ name: 'unseen', required: false, type: Boolean })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @Get('me')
  listMine(@Req() req: any, @Query() q: ListNotificationsDto) {
    return this.service.listForUser(this.uid(req), q);
  }

  // GET /notifications/me/count  -> { total: number }
  @ApiOperation({ summary: 'Cantidad de notificaciones no leídas' })
  @ApiOkResponse({ description: 'Contador de no leídas' })
  @Get('me/count')
  unseenCount(@Req() req: any) {
    return this.service.unseenCount(this.uid(req));
  }

  // SSE /notifications/stream  -> eventos en vivo (Content-Type: text/event-stream)
  // Devuelve eventos con forma { data: {...} }. Incluimos ping cada 25s para mantener vivo el stream.
  @ApiOperation({ summary: 'Stream SSE de notificaciones en tiempo real' })
  @Sse('stream')
  stream(@Req() req: any) {
    const userId = this.uid(req);
    const user$ = this.streams.getChannel(userId).asObservable().pipe(map((data) => ({ data })));
    const ping$ = interval(25000).pipe(map(() => ({ event: 'ping', data: 'keepalive' })));
    return merge(user$, ping$);
  }

  // POST /notifications/:id/read
  @ApiOperation({ summary: 'Marcar una notificación como leída' })
  @ApiOkResponse({ description: 'OK' })
  @ApiParam({ name: 'id', type: Number })
  @Post(':id/read')
  read(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.service.markRead(id, this.uid(req));
  }

  // POST /notifications/read-all
  @ApiOperation({ summary: 'Marcar todas las notificaciones como leídas' })
  @ApiOkResponse({ description: 'OK' })
  @Post('read-all')
  readAll(@Req() req: any) {
    return this.service.markAll(this.uid(req));
  }
}
