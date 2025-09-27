import { Body, Controller, Post, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBody } from '@nestjs/swagger';
import { AiService } from './ai.service';
import { AIDiagnosticsService } from './ai.diagnostics.service';

@ApiTags('ai')
@Controller('ai')
export class AiController {
    constructor(
        private readonly ai: AiService,
        private readonly diag: AIDiagnosticsService,
    ) { }

    @ApiOperation({ summary: 'Probar respuesta simple del modelo' })
    @ApiBody({ schema: { properties: { prompt: { type: 'string' } } } })
    @Post('echo')
    async echo(@Body('prompt') prompt?: string) {
        const text = await this.ai.chat(prompt ?? 'Decime hola en una línea.');
        return { text };
    }

    @ApiOperation({ summary: 'Diagnóstico asistido por IA del backend' })
    @Post('diagnose')
    async diagnose() {
        return this.diag.run();
    }

    // Diagnóstico
    @Get('ping')
    ping() {
        return this.ai.pingModels();
    }
}
