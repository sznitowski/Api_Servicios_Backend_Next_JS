// src/modules/ai/ai.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AiService } from './ai.service';
import { AIDiagnosticsService } from './ai.diagnostics.service';
import { AiController } from './ai.controller';

import { AIUsage } from './ai-usage.entity';
import { ServiceRequest } from '../request/request.entity';
import { RequestTransition } from '../request/request-transition.entity';
import { Notification } from '../notifications/notification.entity';
import { NotificationPreferences } from '../notifications/notification-preferences.entity';

@Module({
  imports: [
    // Repos que inyectan AiService y AIDiagnosticsService
    TypeOrmModule.forFeature([
      AIUsage,                 // <- AIUsageRepository
      ServiceRequest,          // <- ServiceRequestRepository
      RequestTransition,       // <- RequestTransitionRepository
      Notification,            // <- NotificationRepository
      NotificationPreferences, // <- NotificationPreferencesRepository
    ]),
  ],
  controllers: [AiController],
  providers: [AiService, AIDiagnosticsService],
  exports: [AiService, AIDiagnosticsService],
})
export class AiModule {}
