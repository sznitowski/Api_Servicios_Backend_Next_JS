// src/modules/notifications/notifications.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { Notification, NotificationType } from './notification.entity';
import { RequestTransition } from '../request/request-transition.entity';
import { ServiceRequest } from '../request/request.entity';
import { ListNotificationsDto } from './dto/list-notifications.dto';

@Injectable()
export class NotificationsService {
  createFromTransition: any;
  constructor(
    @InjectRepository(Notification)
    private readonly repo: Repository<Notification>,
  ) {}

  // Crea notificaciones a partir de una transición de Request.
  // - Si actúa el PROVEEDOR -> notifica al CLIENTE.
  // - Si actúa el CLIENTE   -> notifica al PROVEEDOR (si existe).
  // - Si actúa un tercero (admin) -> notifica a ambos (si existen).
 async notifyTransition(
    transition: RequestTransition,
    req: ServiceRequest,
    actorIdExplicit?: number | null,     // 👈 nuevo parámetro
  ): Promise<void> {
    const to = transition.toStatus;
    const type =
      (to === 'CANCELLED' && transition.notes === 'Admin cancel')
        ? NotificationType.ADMIN_CANCEL
        : (to as NotificationType);

    // Preferimos el actorId explícito; si no, el de la relación (por si vino cargada)
    const actorId = actorIdExplicit ?? transition.actor?.id ?? null;

    const targets = new Set<number>();
    if (actorId && req.client?.id === actorId) {
      if (req.provider?.id) targets.add(req.provider.id);
    } else if (actorId && req.provider?.id === actorId) {
      targets.add(req.client.id);
    } else {
      // actor desconocido/externo -> ambos si existen
      if (req.client?.id) targets.add(req.client.id);
      if (req.provider?.id) targets.add(req.provider.id);
    }

    if (targets.size === 0) return; // nada que notificar

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

    await this.repo.save(rows);
  }

  // Mensaje simple (luego se puede i18n)
  private buildMessage(type: NotificationType, req: ServiceRequest): string {
    switch (type) {
      case NotificationType.OFFERED:
        return `Nueva oferta en "${req.title}"`;
      case NotificationType.ACCEPTED:
        return `Se aceptó la oferta en "${req.title}"`;
      case NotificationType.IN_PROGRESS:
        return `Trabajo iniciado en "${req.title}"`;
      case NotificationType.DONE:
        return `Trabajo completado en "${req.title}"`;
      case NotificationType.CANCELLED:
        return `Trabajo cancelado en "${req.title}"`;
      case NotificationType.ADMIN_CANCEL:
        return `Un administrador canceló "${req.title}"`;
      default:
        return `Actualización en "${req.title}"`;
    }
  }

  // Lista paginada de notificaciones del usuario actual.
  // Si unseen=true, sólo trae no leídas.
  async listForUser(userId: number, q: ListNotificationsDto) {
    const page = Math.max(1, Number(q.page ?? 1));
    const limit = Math.max(1, Math.min(Number(q.limit ?? 20), 50));

    const where: any = { user: { id: userId } };
    if (q.unseen) where.seenAt = IsNull();

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
        transition: {
          id: true,
          fromStatus: true,
          toStatus: true,
          createdAt: true,
        },
      },
    });

    return {
      items,
      meta: { page, limit, total, pages: Math.ceil(total / limit) },
    };
  }

  // Marca UNA notificación como leída (si pertenece al usuario).
  async markRead(id: number, userId: number) {
    const row = await this.repo.findOne({
      where: { id, user: { id: userId } as any },
    });
    if (!row) throw new NotFoundException('Notification not found');
    if (!row.seenAt) {
      row.seenAt = new Date();
      await this.repo.save(row);
    }
    return { ok: true };
  }

  // Marca TODAS como leídas (compatibilidad MySQL/SQLite, sin tocar nombres de columnas).
  async markAll(userId: number) {
    await this.repo.update(
      { user: { id: userId } as any, seenAt: IsNull() },
      { seenAt: new Date() },
    );
    return { ok: true };
  }

  // (Opcional) Badge para UI: cantidad de no leídas.
  async countUnseen(userId: number) {
    const unseen = await this.repo.count({
      where: { user: { id: userId } as any, seenAt: IsNull() },
    });
    return { unseen };
  }
}
