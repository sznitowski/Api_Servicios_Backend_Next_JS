// src/modules/notifications/notifications.controller.ts
import {
  Body,
  Controller,
  Get,
  Post,
  Put,
  Param,
  ParseIntPipe,
  Query,
  Req,
  UseGuards,
  Sse,
  MessageEvent,
  Delete,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
  ApiBody,
  ApiNoContentResponse,
} from '@nestjs/swagger';
import { Observable, interval, merge, map } from 'rxjs';

import { NotificationsService } from './notifications.service';
import { ListNotificationsDto } from './dto/list-notifications.dto';
import { UpdateNotificationPrefsDto } from './dto/update-notification-prefs.dto';
import { NotificationStreamService } from './notification-stream.service';

@ApiTags('notifications')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('notifications')
export class NotificationsController {
  constructor(
    private readonly service: NotificationsService,
    private readonly streams: NotificationStreamService,
  ) { }

  // Helper: userId desde el token
  private uid(req: any): number {
    return Number(req?.user?.id ?? req?.user?.sub);
  }

  // GET /notifications/me -> listado paginado
  @ApiOperation({ summary: 'Listar mis notificaciones' })
  @ApiOkResponse({ description: 'Listado paginado' })
  @ApiQuery({ name: 'unseen', required: false, type: Boolean })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @Get('me')
  listMine(@Req() req: any, @Query() q: ListNotificationsDto) {
    return this.service.listForUser(this.uid(req), q);
  }

  // GET /notifications/me/count -> badge de no leídas
  @ApiOperation({ summary: 'Badge de no leídas' })
  @ApiOkResponse({ description: '{ total: number }' })
  @Get('me/count')
  unseenCount(@Req() req: any) {
    return this.service.unseenCount(this.uid(req));
  }

  // POST /notifications/:id/read -> marca una como leída
  @ApiOperation({ summary: 'Marcar una notificación como leída' })
  @ApiOkResponse({ description: 'OK' })
  @ApiParam({ name: 'id', type: Number })
  @Post(':id/read')
  read(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.service.markRead(id, this.uid(req));
  }

  // POST /notifications/read-all -> marca todas como leídas
  @ApiOperation({ summary: 'Marcar todas como leídas' })
  @ApiOkResponse({ description: 'OK' })
  @Post('read-all')
  readAll(@Req() req: any) {
    return this.service.markAll(this.uid(req));
  }

  // GET /notifications/me/prefs -> obtiene preferencias del usuario
  @ApiOperation({ summary: 'Obtener mis preferencias de notificaciones' })
  @ApiOkResponse({ description: '{ userId, disabledTypes: string[] }' })
  @Get('me/prefs')
  getPrefs(@Req() req: any) {
    return this.service.getPrefs(this.uid(req));
  }

  // PUT /notifications/prefs -> actualiza preferencias del usuario
  @ApiOperation({ summary: 'Actualizar mis preferencias de notificaciones' })
  @ApiOkResponse({ description: 'Guardado' })
  @ApiBody({ type: UpdateNotificationPrefsDto })
  @Put('prefs')
  updatePrefs(@Req() req: any, @Body() body: UpdateNotificationPrefsDto) {
    return this.service.updatePrefs(this.uid(req), body);
  }

  // GET /notifications/stream -> SSE en tiempo real
  @ApiOperation({ summary: 'Stream SSE de notificaciones en tiempo real' })
  @ApiNoContentResponse({ description: 'SSE stream' })
  @Sse('stream')
  stream(@Req() req: any): Observable<MessageEvent> {
    const userId = this.uid(req);

    const user$ = (this.streams.getChannel(userId) as any).pipe(
      map((data: any) => ({ data } as MessageEvent)),
    );

    const ping$ = interval(25_000).pipe(
      map(() => ({ event: 'ping', data: 'keepalive' } as MessageEvent)),
    );

    return merge(user$, ping$) as Observable<MessageEvent>;
  }

  // DELETE /notifications/:id -> borra una notificación propia
  @ApiOperation({ summary: 'Borrar una notificación' })
  @ApiOkResponse({ description: 'Eliminada' })
  @ApiParam({ name: 'id', type: Number })
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.service.removeOne(id, this.uid(req));
  }

  // POST /notifications/clear-read -> borra todas las leídas
  @ApiOperation({ summary: 'Borrar todas las notificaciones leídas' })
  @ApiOkResponse({ description: 'OK' })
  @Post('clear-read')
  clearRead(@Req() req: any) {
    return this.service.clearRead(this.uid(req));
  }
}
