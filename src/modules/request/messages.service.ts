// src/modules/request/messages.service.ts
import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RequestMessage } from './request-message.entity';
import { ServiceRequest } from './request.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/notification.entity';

@Injectable()
export class MessagesService {
  private readonly logger = new Logger(MessagesService.name);

  constructor(
    @InjectRepository(RequestMessage)
    private readonly repo: Repository<RequestMessage>,
    @InjectRepository(ServiceRequest)
    private readonly reqRepo: Repository<ServiceRequest>,
    private readonly notifications: NotificationsService,
  ) {}

  private async ensureParticipant(requestId: number, userId: number) {
    const exists = await this.reqRepo
      .createQueryBuilder('r')
      .leftJoin('r.client', 'c')
      .leftJoin('r.provider', 'p')
      .where('r.id = :rid AND (c.id = :uid OR p.id = :uid)', { rid: requestId, uid: userId })
      .getCount();

    if (!exists) {
      throw new ForbiddenException('Not a participant');
    }
  }

  async send(userId: number, requestId: number, body: string) {
    if (!body || body.trim().length === 0) throw new BadRequestException('Empty body');
    if (body.length > 1000) throw new BadRequestException('Body too long');

    await this.ensureParticipant(requestId, userId);

    const req = await this.reqRepo.findOne({
      where: { id: requestId },
      relations: { client: true, provider: true },
    });
    if (!req) throw new NotFoundException('Request not found');

    const saved = await this.repo.save(
      this.repo.create({
        request: { id: req.id } as any,
        sender: { id: userId } as any,
        body: body.trim(),
      }),
    );

    // Notificar a la contraparte
    const targetId = req.client?.id === userId ? req.provider?.id : req.client?.id;
    if (targetId) {
      const trimmed = body.trim();
      const snippet = trimmed.length > 140 ? `${trimmed.slice(0, 137)}...` : trimmed;

      try {
        await this.notifications.createManual({
          userId: targetId,
          requestId: req.id,
          type: NotificationType.MESSAGE,
          message: `Nuevo mensaje en "${req.title}": ${snippet}`,
          // Si tu NotificationsService ya soporta estos campos, MEJOR:
          // channel: NotificationChannel.IN_APP,
          // data: { messageId: saved.id },
          // title: `Nuevo mensaje en "${req.title}"`,
        });
      } catch (err) {
        // No rompemos el flujo, pero queda log
        this.logger.warn(
          `No se pudo crear la notificación MESSAGE para userId=${targetId}, requestId=${req.id}: ${err?.message ?? err}`,
        );
      }
    }

    return saved;
  }

  async list(userId: number, requestId: number, page = 1, limit = 50) {
    await this.ensureParticipant(requestId, userId);

    const p = Math.max(1, Number(page));
    const l = Math.max(1, Math.min(Number(limit), 100));

    const [rows, total] = await this.repo.findAndCount({
      where: { request: { id: requestId } as any },
      order: { createdAt: 'ASC', id: 'ASC' },
      skip: (p - 1) * l,
      take: l,
      relations: { sender: true },
    });

    const items = rows.map((m) => ({
      id: m.id,
      body: m.body,
      createdAt: m.createdAt,
      sender: m.sender ? { id: (m.sender as any).id } : null,
    }));

    return { items, meta: { total, page: p, limit: l } };
  }
}
