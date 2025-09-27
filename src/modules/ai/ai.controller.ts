import { Body, Controller, Post, Get, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBody } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AiService } from './ai.service';
import { AIDiagnosticsService } from './ai.diagnostics.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('ai')
@Controller('ai')
export class AiController {
  constructor(
    private readonly ai: AiService,
    private readonly diag: AIDiagnosticsService,
  ) {}

  private uid(req: any): number | null {
    return Number(req?.user?.id ?? req?.user?.sub ?? null) || null;
  }

  @ApiOperation({ summary: 'Probar respuesta simple del modelo' })
  @ApiBody({ schema: { properties: { prompt: { type: 'string' } } } })
  @UseGuards(JwtAuthGuard) // quitá esto si querés que sea público
  @Throttle({ default: { limit: 10, ttl: 60_000 } }) // <-- firma nueva (ttl en ms)
  @Post('echo')
  async echo(@Body('prompt') prompt: string, @Req() req: any) {
    const text = await this.ai.chat(prompt ?? 'Decime hola en una línea.', this.uid(req));
    return { text };
  }

  @ApiOperation({ summary: 'Diagnóstico asistido por IA del backend' })
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('diagnose')
  async diagnose() {
    return this.diag.run();
  }

  @Get('ping')
  ping() {
    return this.ai.pingModels();
  }
}
