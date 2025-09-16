// src/modules/notifications/notifications.controller.ts
import {
  Controller,
  Get,
  Post,
  Param,
  ParseIntPipe,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';

import { NotificationsService } from './notifications.service';
import { ListNotificationsDto } from './dto/list-notifications.dto';

@ApiTags('notifications')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly service: NotificationsService) {}

  // helper para extraer el userId del token (acepta {id} o {sub})
  private uid(req: any): number {
    return Number(req?.user?.id ?? req?.user?.sub);
  }

  // GET /notifications/me?unseen=true&page=1&limit=20
  // Lista paginada de notificaciones del usuario actual.
  // Si unseen=true, devuelve sólo no leídas.
  @ApiOperation({ summary: 'Listar mis notificaciones' })
  @ApiOkResponse({ description: 'Listado paginado' })
  @ApiQuery({ name: 'unseen', required: false, type: Boolean })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @Get('me')
  listMine(@Req() req: any, @Query() q: ListNotificationsDto) {
    // el DTO ya normaliza unseen/page/limit
    return this.service.listForUser(this.uid(req), q);
  }

  // POST /notifications/:id/read
  // Marca como leída una notificación específica si pertenece al usuario.
  @ApiOperation({ summary: 'Marcar una notificación como leída' })
  @ApiOkResponse({ description: 'OK' })
  @ApiParam({ name: 'id', type: Number })
  @Post(':id/read')
  read(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.service.markRead(id, this.uid(req));
  }

  // POST /notifications/read-all
  // Marca como leídas todas las notificaciones del usuario actual.
  @ApiOperation({ summary: 'Marcar todas las notificaciones como leídas' })
  @ApiOkResponse({ description: 'OK' })
  @Post('read-all')
  readAll(@Req() req: any) {
    return this.service.markAll(this.uid(req));
  }
}
