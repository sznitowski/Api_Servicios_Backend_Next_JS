// src/modules/ai/ai.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule } from '@nestjs/throttler';
import { AiService } from './ai.service';
import { AiController } from './ai.controller';
import { AIDiagnosticsService } from './ai.diagnostics.service';
import { AIUsage } from './ai-usage.entity';

// importa lo que ya usabas para diagnósticos si aplica…

@Module({
  imports: [
    TypeOrmModule.forFeature([AIUsage]),
    // límite base del módulo (puede sobreescribirse por @Throttle en métodos)
    ThrottlerModule.forRoot([{
      ttl: 60_000,
      limit: 30,
    }]),
  ],
  controllers: [AiController],
  providers: [AiService, AIDiagnosticsService],
  exports: [AiService],
})
export class AiModule {}
