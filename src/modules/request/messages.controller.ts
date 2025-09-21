// src/modules/request/messages.controller.ts
import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
  ApiBody,
} from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

import { MessagesService } from './messages.service';

// 👇 IMPORTS CORRECTOS
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { UserRole } from '../users/user.entity';

class SendMessageDto {
  @IsString()
  @MinLength(1)
  @MaxLength(1000)
  body!: string;
}

@ApiTags('messages')
@ApiBearerAuth()
// 👇 agrega RolesGuard junto al AuthGuard
@UseGuards(AuthGuard('jwt'), RolesGuard)
// 👇 habilita acceso a CLIENT y PROVIDER
@Roles(UserRole.CLIENT, UserRole.PROVIDER)
@Controller('requests/:id/messages')
export class MessagesController {
  constructor(private readonly service: MessagesService) {}

  private uid(req: any) {
    return Number(req?.user?.id ?? req?.user?.sub);
  }

  @ApiOperation({ summary: 'Enviar mensaje' })
  @ApiOkResponse({ description: 'Mensaje creado' })
  @ApiBody({ type: SendMessageDto })
  @Post()
  send(
    @Req() req: any,
    @Param('id', ParseIntPipe) requestId: number,
    @Body() dto: SendMessageDto,
  ) {
    return this.service.send(this.uid(req), requestId, dto.body);
  }

  @ApiOperation({ summary: 'Listar mensajes del request' })
  @ApiOkResponse({ description: 'Listado paginado' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @Get()
  list(
    @Req() req: any,
    @Param('id', ParseIntPipe) requestId: number,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.service.list(
      this.uid(req),
      requestId,
      Number(page ?? 1),
      Number(limit ?? 50),
    );
  }
}
