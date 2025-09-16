import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification, NotificationType } from './notification.entity';
import { RequestTransition } from '../request/request-transition.entity';
import { ServiceRequest } from '../request/request.entity';
import { ListNotificationsDto } from './dto/list-notifications.dto';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private readonly repo: Repository<Notification>,
  ) {}

  // Crea notificaciones a partir de una transición.
  // - Si actúa el PROVEEDOR -> notifica al CLIENTE.
  // - Si actúa el CLIENTE   -> notifica al PROVEEDOR (si existe).
  // - Si actúa un tercero (admin) -> notifica a ambos si existen.
  async notifyTransition(
    transition: RequestTransition,
    req: ServiceRequest,
  ): Promise<void> {
    const to = transition.toStatus;
    const type =
      (to === 'CANCELLED' && transition.notes === 'Admin cancel')
        ? NotificationType.ADMIN_CANCEL
        : (to as NotificationType);

    const actorId = transition.actor?.id ?? null;

    const targets = new Set<number>();
    if (actorId && req.client?.id === actorId) {
      if (req.provider?.id) targets.add(req.provider.id);
    } else if (actorId && req.provider?.id === actorId) {
      targets.add(req.client.id);
    } else {
      // actor desconocido/externo -> ambos si existen
      targets.add(req.client.id);
      if (req.provider?.id) targets.add(req.provider.id);
    }

    const message = this.buildMessage(type, req);

    const rows = [...targets].map((uid) =>
      this.repo.create({
        user: { id: uid } as any,
        request: { id: req.id } as any,
        transition: { id: transition.id } as any,
        type,
        message,
        seenAt: null,
      }),
    );

    if (rows.length) await this.repo.save(rows);
  }

  // Texto simple para UI / pruebas (luego podés internacionalizar)
  private buildMessage(type: NotificationType, req: ServiceRequest): string {
    switch (type) {
      case NotificationType.OFFERED: return `Nueva oferta en "${req.title}"`;
      case NotificationType.ACCEPTED: return `Se aceptó la oferta en "${req.title}"`;
      case NotificationType.IN_PROGRESS: return `Trabajo iniciado en "${req.title}"`;
      case NotificationType.DONE: return `Trabajo completado en "${req.title}"`;
      case NotificationType.CANCELLED: return `Trabajo cancelado en "${req.title}"`;
      case NotificationType.ADMIN_CANCEL: return `Un administrador canceló "${req.title}"`;
      default: return `Actualización en "${req.title}"`;
    }
  }

  // Lista paginada de notificaciones del usuario
  async listForUser(userId: number, q: ListNotificationsDto) {
    const page = Math.max(1, Number(q.page ?? 1));
    const limit = Math.max(1, Math.min(Number(q.limit ?? 20), 50));

    const where: any = { user: { id: userId } };
    if (q.unseen) where.seenAt = null;

    const [items, total] = await this.repo.findAndCount({
      where,
      relations: { request: true, transition: true },
      order: { createdAt: 'DESC', id: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        type: true,
        message: true,
        seenAt: true,
        createdAt: true,
        request: { id: true, title: true, status: true },
        transition: { id: true, fromStatus: true, toStatus: true, createdAt: true },
      },
    });

    return { items, meta: { page, limit, total, pages: Math.ceil(total / limit) } };
  }

  // Marcar una notificación como leída
  async markRead(id: number, userId: number) {
    const row = await this.repo.findOne({ where: { id, user: { id: userId } as any } });
    if (!row) throw new NotFoundException('Notification not found');
    if (!row.seenAt) {
      row.seenAt = new Date();
      await this.repo.save(row);
    }
    return { ok: true };
  }

  // Marcar todas como leídas
  async markAll(userId: number) {
    await this.repo
      .createQueryBuilder()
      .update(Notification)
      .set({ seenAt: () => 'CURRENT_TIMESTAMP(6)' })
      .where('userId = :userId AND seenAt IS NULL', { userId })
      .execute();

    return { ok: true };
  }
}
