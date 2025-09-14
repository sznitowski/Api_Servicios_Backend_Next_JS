// src/modules/request/requests.controller.ts
import {
  Controller,
  Post,
  Body,
  UseGuards,
  Req,
  Get,
  Param,
  ParseIntPipe,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RequestsService } from './requests.service';
import { CreateRequestDto } from './dto/create-request.dto';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../users/user.entity';
import { OfferDto, AcceptDto } from './dto/transition.dto';

// 🔽 Swagger
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiBadRequestResponse,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { RatingsService } from '../ragings/ratings.service';
import { CreateRatingDto } from '../ragings/dto/create-rating.dto';

@ApiTags('requests')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('requests')
export class RequestsController {
  constructor(
    private readonly service: RequestsService,
    private readonly ratings: RatingsService,
  ) { }

  // ---------------------- CREATE ----------------------
  @ApiOperation({ summary: 'Crear un request' })
  @ApiBody({ type: CreateRequestDto })
  @ApiCreatedResponse({
    description: 'Request creado',
    schema: {
      example: {
        id: 10,
        title: 'Mudanza',
        lat: -34.6037,
        lng: -58.3816,
        status: 'PENDING',
        priceOffered: '500',
        client: { id: 3 },
        serviceType: { id: 1, name: 'Mudanza' },
        createdAt: '2025-01-01T12:00:00.000Z',
        updatedAt: '2025-01-01T12:00:00.000Z',
      },
    },
  })
  @ApiBadRequestResponse({ description: 'Datos inválidos' })
  @ApiUnauthorizedResponse({ description: 'No autenticado' })
  @Post()
  create(@Body() body: CreateRequestDto, @Req() req: any) {
    return this.service.create(body, req.user.sub);
  }

  // ---------------------- GET BY ID ----------------------
  @ApiOperation({ summary: 'Obtener un request por id' })
  @ApiParam({ name: 'id', type: Number })
  @ApiOkResponse({
    description: 'Request encontrado',
    schema: {
      example: {
        id: 10,
        title: 'Mudanza',
        status: 'PENDING',
        client: { id: 3, email: 'test@demo.com' },
        provider: null,
        serviceType: { id: 1, name: 'Mudanza' },
      },
    },
  })
  @ApiNotFoundResponse({ description: 'Request not found' })
  @ApiUnauthorizedResponse({ description: 'No autenticado' })
  @Get(':id')
  get(@Param('id', ParseIntPipe) id: number) {
    return this.service.get(id);
  }

  // ---------------------- TIMELINE ----------------------
  @ApiOperation({ summary: 'Ver timeline (historial) de un request' })
  @ApiParam({ name: 'id', type: Number })
  @ApiOkResponse({
    description: 'Transiciones del request',
    schema: {
      example: [
        {
          id: 1,
          fromStatus: 'PENDING',
          toStatus: 'OFFERED',
          priceOffered: '600',
          priceAgreed: null,
          notes: null,
          createdAt: '2025-01-02T09:00:00.000Z',
          actor: { id: 5, email: 'prov@demo.com', name: 'prov', role: 'PROVIDER' },
        },
      ],
    },
  })
  @ApiNotFoundResponse({ description: 'Request not found' })
  @ApiUnauthorizedResponse({ description: 'No autenticado' })
  @Get(':id/timeline')
  timeline(@Param('id', ParseIntPipe) id: number) {
    return this.service.timeline(id);
  }

  // ---------------------- CLAIM ----------------------
  @ApiOperation({ summary: 'Claim (proveedor ofrece tomar el request)' })
  @ApiParam({ name: 'id', type: Number })
  @ApiBody({ type: OfferDto })
  @ApiOkResponse({
    description: 'Request ofertado por el proveedor',
    schema: {
      example: { id: 10, status: 'OFFERED', priceOffered: '550', provider: { id: 5 } },
    },
  })
  @ApiBadRequestResponse({ description: 'Only PENDING can be claimed' })
  @ApiForbiddenResponse({ description: 'Rol no permitido o no autorizado' })
  @ApiUnauthorizedResponse({ description: 'No autenticado' })
  @Post(':id/claim')
  @UseGuards(RolesGuard)
  @Roles(UserRole.PROVIDER, UserRole.ADMIN)
  claim(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: OfferDto,
    @Req() req: any,
  ) {
    return this.service.claim(id, req.user.sub, body.priceOffered);
  }

  // ---------------------- ACCEPT ----------------------
  @ApiOperation({ summary: 'Accept (cliente acepta la oferta)' })
  @ApiParam({ name: 'id', type: Number })
  @ApiBody({ type: AcceptDto })
  @ApiOkResponse({
    description: 'Request aceptado por el cliente',
    schema: {
      example: { id: 10, status: 'ACCEPTED', priceAgreed: '600' },
    },
  })
  @ApiBadRequestResponse({ description: 'Only OFFERED can be accepted' })
  @ApiForbiddenResponse({ description: 'Not your request' })
  @ApiUnauthorizedResponse({ description: 'No autenticado' })
  @Post(':id/accept')
  @UseGuards(RolesGuard)
  @Roles(UserRole.CLIENT, UserRole.ADMIN)
  accept(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: AcceptDto,
    @Req() req: any,
  ) {
    return this.service.accept(id, req.user.sub, body.priceAgreed);
  }

  // ---------------------- START ----------------------
  @ApiOperation({ summary: 'Start (proveedor inicia el trabajo)' })
  @ApiParam({ name: 'id', type: Number })
  @ApiOkResponse({ description: 'Request en progreso', schema: { example: { id: 10, status: 'IN_PROGRESS' } } })
  @ApiBadRequestResponse({ description: 'Only ACCEPTED can start' })
  @ApiForbiddenResponse({ description: 'Not your assignment' })
  @ApiUnauthorizedResponse({ description: 'No autenticado' })
  @Post(':id/start')
  @UseGuards(RolesGuard)
  @Roles(UserRole.PROVIDER, UserRole.ADMIN)
  start(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.service.start(id, req.user.sub);
  }

  // ---------------------- COMPLETE ----------------------
  @ApiOperation({ summary: 'Complete (proveedor completa el trabajo)' })
  @ApiParam({ name: 'id', type: Number })
  @ApiOkResponse({ description: 'Request completado', schema: { example: { id: 10, status: 'DONE' } } })
  @ApiBadRequestResponse({ description: 'Only IN_PROGRESS can be completed' })
  @ApiForbiddenResponse({ description: 'Not your assignment' })
  @ApiUnauthorizedResponse({ description: 'No autenticado' })
  @Post(':id/complete')
  @UseGuards(RolesGuard)
  @Roles(UserRole.PROVIDER, UserRole.ADMIN)
  complete(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.service.complete(id, req.user.sub);
  }

  // ---------------------- CANCEL ----------------------
  @ApiOperation({ summary: 'Cancelar (cliente o proveedor del request)' })
  @ApiParam({ name: 'id', type: Number })
  @ApiOkResponse({ description: 'Request cancelado', schema: { example: { id: 10, status: 'CANCELLED' } } })
  @ApiBadRequestResponse({ description: 'Cannot cancel DONE' })
  @ApiForbiddenResponse({ description: 'Not allowed' })
  @ApiUnauthorizedResponse({ description: 'No autenticado' })
  @Post(':id/cancel')
  cancel(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.service.cancel(id, req.user.sub);
  }

  // ---------------------- ADMIN CANCEL ----------------------
  @ApiOperation({ summary: 'Cancelar como admin (auditable en timeline)' })
  @ApiParam({ name: 'id', type: Number })
  @ApiOkResponse({
    description: 'Request cancelado por admin',
    schema: { example: { id: 10, status: 'CANCELLED', note: 'Admin cancel' } },
  })
  @ApiUnauthorizedResponse({ description: 'No autenticado' })
  @ApiForbiddenResponse({ description: 'Solo ADMIN' })
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @Post(':id/admin-cancel')
  adminCancel(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.service.adminCancel(id, req.user.sub);
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.CLIENT, UserRole.ADMIN)
  @Post(':id/rate')
  rate(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: CreateRatingDto,
    @Req() req: any,
  ) {
    return this.ratings.rateRequest(id, req.user.sub, body);
  }
}
