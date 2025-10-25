import { Body, Controller, Get, Param, ParseIntPipe, Post, Query } from '@nestjs/common';
import { ApiBody, ApiOkResponse, ApiOperation, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';

import { PaymentsService } from './payments.service';

// DTOs (asegurate de tener estos archivos)
import { CreateIntentDto } from './dto/create-intent.dto';
import { CreateIntentResDto } from './dto/create-intent.res.dto';
import { WebhookPostDto } from './dto/webhook-post.dto';
import { PaymentRecordDto } from './dto/payment-record.dto';

@ApiTags('payments')
@Controller('payments')
export class PaymentsController {
    constructor(
        private readonly payments: PaymentsService,
        private readonly config: ConfigService,
    ) { }

    // ========= Crear preferencia / intent =========
    @Post('intent')
    @ApiOperation({ summary: 'Crear preferencia de pago (MercadoPago)' })
    @ApiOkResponse({ type: CreateIntentResDto })
    async intent(@Body() dto: CreateIntentDto): Promise<CreateIntentResDto> {
        return this.payments.createIntent(dto.requestId) as any;
    }

    // ========= Webhook GET (MP a veces pega GET) =========
    @Get('webhook')
    @ApiOperation({ summary: 'Webhook MercadoPago (GET)' })
    @ApiQuery({ name: 'secret', required: false, description: 'Token simple para validar el webhook' })
    @ApiQuery({ name: 'topic', required: false, example: 'payment' })
    @ApiQuery({ name: 'type', required: false, example: 'payment' })
    @ApiQuery({ name: 'id', required: false, description: 'payment id' })
    @ApiQuery({ name: 'data.id', required: false, description: 'payment id en formato data.id' })
    async webhookGet(
        @Query('secret') secret: string,
        @Query('topic') topic?: string,
        @Query('type') type?: string,
        @Query('id') id?: string,
        @Query('data.id') dataId?: string,
    ) {
        if (!this.isValidSecret(secret)) return { ok: true };
        const t = topic || type;
        const pid = id || dataId;
        if (t === 'payment' && pid) await this.payments.processWebhookPayment(String(pid));
        return { ok: true };
    }

    // ========= Webhook POST (principal) =========
    @Post('webhook')
    @ApiOperation({ summary: 'Webhook MercadoPago (POST)' })
    @ApiQuery({ name: 'secret', required: false, description: 'Token simple para validar el webhook' })
    @ApiBody({ type: WebhookPostDto })
    async webhookPost(@Query('secret') secret: string, @Body() body: WebhookPostDto) {
        if (!this.isValidSecret(secret)) return { ok: true };
        const t = (body as any)?.type || (body as any)?.topic;
        const pid = (body as any)?.['data.id'] || (body as any)?.data?.id || (body as any)?.id;
        if (t === 'payment' && pid) await this.payments.processWebhookPayment(String(pid));
        return { ok: true };
    }

    // ========= Listado de pagos por request (para historial en el front) =========
    @Get('requests/:id')
    @ApiOperation({ summary: 'Listar pagos asociados a un pedido (request)' })
    @ApiParam({ name: 'id', example: 182 })
    @ApiOkResponse({ type: PaymentRecordDto, isArray: true })
    async listByRequest(@Param('id', ParseIntPipe) id: number): Promise<PaymentRecordDto[]> {
        return this.payments.listPaymentsByRequest(id) as any;
    }

    // ========= Util =========
    private isValidSecret(s?: string) {
        const expected = this.config.get<string>('MP_WEBHOOK_SECRET');
        return expected ? s === expected : true; // en dev, si no hay secret, no bloqueamos
    }

    @Get('mp/self')
    @ApiOperation({ summary: 'Debug MP token (users/me)' })
    async mpSelf() {
        const token = this.config.get('MERCADOPAGO_ACCESS_TOKEN');
        const r = await fetch('https://api.mercadopago.com/users/me', {
            headers: { Authorization: `Bearer ${token}` },
        });
        let body: any;
        try { body = await r.json(); } catch { body = await r.text(); }
        return { ok: r.ok, status: r.status, body };
    }

}
