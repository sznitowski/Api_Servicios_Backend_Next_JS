// src/modules/users/users.controller.ts
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

import { UsersService } from './users.service';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';

// 🔽 Swagger
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiUnauthorizedResponse,
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiBody,
  ApiParam,
} from '@nestjs/swagger';

@UseGuards(AuthGuard('jwt'))
@ApiTags('Users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly service: UsersService) {}

  // ---- Perfil (sanitizado)
  @ApiOperation({ summary: 'Mi perfil', description: 'Devuelve el perfil del usuario autenticado (sin campos sensibles).' })
  @ApiOkResponse({
    description: 'Perfil del usuario',
    schema: {
      example: {
        id: 1,
        email: 'test@demo.com',
        name: 'Test',
        role: 'CLIENT',
        active: true,
        createdAt: '2025-01-01T12:00:00.000Z',
        updatedAt: '2025-01-01T12:00:00.000Z',
      },
    },
  })
  @ApiUnauthorizedResponse({ description: 'No autenticado' })
  @Get('me')
  me(@Req() req: any) {
    return this.service.getMe(req.user.sub);
  }

  // ---- Direcciones del usuario
  @ApiOperation({ summary: 'Listar mis direcciones' })
  @ApiOkResponse({
    description: 'Listado de direcciones',
    schema: {
      example: [
        {
          id: 10,
          street: 'Av. Siempre Viva 742',
          city: 'Springfield',
          lat: -34.6037,
          lng: -58.3816,
          notes: 'Piso 3, Depto B',
          isDefault: true,
          createdAt: '2025-01-01T12:00:00.000Z',
          updatedAt: '2025-01-01T12:00:00.000Z',
        },
      ],
    },
  })
  @ApiUnauthorizedResponse({ description: 'No autenticado' })
  @Get('me/addresses')
  listMy(@Req() req: any) {
    return this.service.listMyAddresses(req.user.sub);
  }

  @ApiOperation({ summary: 'Crear una dirección' })
  @ApiBody({ type: CreateAddressDto })
  @ApiCreatedResponse({
    description: 'Dirección creada',
    schema: {
      example: {
        id: 11,
        street: 'Calle 123',
        city: 'Buenos Aires',
        lat: -34.60,
        lng: -58.38,
        notes: null,
        isDefault: false,
        createdAt: '2025-01-01T12:00:00.000Z',
        updatedAt: '2025-01-01T12:00:00.000Z',
      },
    },
  })
  @ApiBadRequestResponse({ description: 'Body inválido' })
  @ApiUnauthorizedResponse({ description: 'No autenticado' })
  @Post('me/addresses')
  createMy(@Body() dto: CreateAddressDto, @Req() req: any) {
    return this.service.createMyAddress(req.user.sub, dto);
  }

  @ApiOperation({ summary: 'Actualizar una dirección propia' })
  @ApiParam({ name: 'id', type: Number, example: 10 })
  @ApiBody({ type: UpdateAddressDto })
  @ApiOkResponse({
    description: 'Dirección actualizada',
    schema: {
      example: {
        id: 10,
        street: 'Av. Siempre Viva 742',
        city: 'Springfield',
        lat: -34.6037,
        lng: -58.3816,
        notes: 'Actualizar referencia',
        isDefault: true,
        createdAt: '2025-01-01T12:00:00.000Z',
        updatedAt: '2025-01-02T10:00:00.000Z',
      },
    },
  })
  @ApiBadRequestResponse({ description: 'Body inválido' })
  @ApiNotFoundResponse({ description: 'Dirección no encontrada o no pertenece al usuario' })
  @ApiUnauthorizedResponse({ description: 'No autenticado' })
  @Patch('me/addresses/:id')
  updateMy(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateAddressDto,
    @Req() req: any,
  ) {
    return this.service.updateMyAddress(req.user.sub, id, dto);
  }

  @ApiOperation({ summary: 'Eliminar una dirección propia' })
  @ApiParam({ name: 'id', type: Number, example: 10 })
  @ApiOkResponse({
    description: 'Eliminada',
    schema: { example: { success: true } },
  })
  @ApiNotFoundResponse({ description: 'Dirección no encontrada o no pertenece al usuario' })
  @ApiUnauthorizedResponse({ description: 'No autenticado' })
  @Delete('me/addresses/:id')
  deleteMy(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.service.deleteMyAddress(req.user.sub, id);
  }
}
