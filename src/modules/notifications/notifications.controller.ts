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
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { JwtOrQueryGuard } from '../../common/guards/jwt-or-query.guard';
import { NotificationType } from './notification.entity';

@ApiTags('notifications')
@ApiBearerAuth()
@Controller('notifications')
export class NotificationsController {
  constructor(
    private readonly service: NotificationsService,
    private readonly streams: NotificationStreamService,
  ) {}

  private uid(req: any): number {
    return Number(req?.user?.id ?? req?.user?.sub);
  }

  @ApiOperation({ summary: 'Listar mis notificaciones' })
  @ApiOkResponse({ description: 'Listado paginado' })
  @ApiQuery({ name: 'unseen', required: false, type: Boolean })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @UseGuards(JwtAuthGuard)
  @Get('me')
  listMine(@Req() req: any, @Query() q: ListNotificationsDto) {
    return this.service.listForUser(this.uid(req), q);
  }

  @ApiOperation({ summary: 'Badge de no leídas' })
  @ApiOkResponse({ description: '{ total: number }' })
  @UseGuards(JwtAuthGuard)
  @Get('me/count')
  unseenCount(@Req() req: any) {
    return this.service.unseenCount(this.uid(req));
  }

  @ApiOperation({ summary: 'Marcar una notificación como leída' })
  @ApiOkResponse({ description: 'OK' })
  @ApiParam({ name: 'id', type: Number })
  @UseGuards(JwtAuthGuard)
  @Post(':id/read')
  read(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.service.markRead(id, this.uid(req));
  }

  @ApiOperation({ summary: 'Marcar todas como leídas' })
  @ApiOkResponse({ description: 'OK' })
  @UseGuards(JwtAuthGuard)
  @Post('read-all')
  readAll(@Req() req: any) {
    return this.service.markAll(this.uid(req));
  }

  @ApiOperation({ summary: 'Obtener mis preferencias de notificaciones' })
  @ApiOkResponse({ description: '{ userId, disabledTypes: string[] }' })
  @UseGuards(JwtAuthGuard)
  @Get('me/prefs')
  getPrefs(@Req() req: any) {
    return this.service.getPrefs(this.uid(req));
  }

  @ApiOperation({ summary: 'Actualizar mis preferencias de notificaciones' })
  @ApiOkResponse({ description: 'Guardado' })
  @ApiBody({ type: UpdateNotificationPrefsDto })
  @UseGuards(JwtAuthGuard)
  @Put('prefs')
  updatePrefs(@Req() req: any, @Body() body: UpdateNotificationPrefsDto) {
    return this.service.updatePrefs(this.uid(req), body);
  }

  @ApiOperation({ summary: 'Listar tipos de notificación disponibles' })
  @ApiOkResponse({ description: '{ types: string[] }' })
  @UseGuards(JwtAuthGuard)
  @Get('types')
  getTypes() {
    return { types: Object.values(NotificationType) };
  }

  // SSE: acepta Authorization O ?access_token=
  @ApiOperation({ summary: 'Stream SSE de notificaciones en tiempo real' })
  @ApiNoContentResponse({ description: 'SSE stream' })
  @UseGuards(JwtOrQueryGuard)
  @Sse('stream')
  stream(@Req() req: any): Observable<MessageEvent> {
    const userId = this.uid(req);

    const user$ = (this.streams.getChannel(userId) as any).pipe(
      map((data: any) => ({ data } as MessageEvent)),
    );

    const ping$ = interval(25_000).pipe(
      map((i) => ({ id: String(i + 1), event: 'ping', data: 'keepalive' } as MessageEvent)),
    );

    return merge(user$, ping$) as Observable<MessageEvent>;
  }

  @ApiOperation({ summary: 'Borrar una notificación' })
  @ApiOkResponse({ description: 'Eliminada' })
  @ApiParam({ name: 'id', type: Number })
  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.service.removeOne(id, this.uid(req));
  }

  @ApiOperation({ summary: 'Borrar todas las notificaciones leídas' })
  @ApiOkResponse({ description: 'OK' })
  @UseGuards(JwtAuthGuard)
  @Post('clear-read')
  clearRead(@Req() req: any) {
    return this.service.clearRead(this.uid(req));
  }
}
