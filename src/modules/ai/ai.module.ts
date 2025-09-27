import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AiService } from './ai.service';
import { AiController } from './ai.controller';
import { AIDiagnosticsService } from './ai.diagnostics.service';

import { ServiceRequest } from '../request/request.entity';
import { RequestTransition } from '../request/request-transition.entity';
import { Notification } from '../notifications/notification.entity';
import { NotificationPreferences } from '../notifications/notification-preferences.entity';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([
      ServiceRequest,
      RequestTransition,
      Notification,
      NotificationPreferences,
    ]),
  ],
  controllers: [AiController],
  providers: [AiService, AIDiagnosticsService],
  exports: [AiService, AIDiagnosticsService],
})
export class AiModule {}
