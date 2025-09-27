import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AiService } from './ai.service';
import { ServiceRequest } from '../request/request.entity';
import { RequestTransition } from '../request/request-transition.entity';
import { Notification } from '../notifications/notification.entity';
import { NotificationPreferences } from '../notifications/notification-preferences.entity';

@Injectable()
export class AIDiagnosticsService {
  constructor(
    private readonly ai: AiService,
    @InjectRepository(ServiceRequest) private readonly reqRepo: Repository<ServiceRequest>,
    @InjectRepository(RequestTransition) private readonly trRepo: Repository<RequestTransition>,
    @InjectRepository(Notification) private readonly notifRepo: Repository<Notification>,
    @InjectRepository(NotificationPreferences) private readonly prefsRepo: Repository<NotificationPreferences>,
  ) {}

  async run() {
    const [requests, transitions, notifs, prefs] = await Promise.all([
      this.reqRepo.count(),
      this.trRepo.count(),
      this.notifRepo.count(),
      this.prefsRepo.count(),
    ]);

    const prompt = `
Tenemos un backend NestJS. Métricas rápidas:
- service_requests: ${requests}
- request_transitions: ${transitions}
- notifications: ${notifs}
- notification_preferences: ${prefs}

Dame 3 sugerencias concisas (en español) para mejorar estabilidad/observabilidad y detectar errores comunes (SSE, TypeORM, JWT).
Formato: lista con viñetas cortas.`;

    const suggestions = await this.ai.chat(prompt);
    return { metrics: { requests, transitions, notifs, prefs }, suggestions };
  }
}
