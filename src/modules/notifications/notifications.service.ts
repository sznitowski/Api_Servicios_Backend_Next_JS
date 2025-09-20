// src/modules/notifications/notifications.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, In, IsNull, Repository } from 'typeorm';

import { Notification, NotificationType } from './notification.entity';
import { NotificationPreferences } from './notification-preferences.entity';
import { RequestTransition } from '../request/request-transition.entity';
import { ServiceRequest } from '../request/request.entity';
import { ListNotificationsDto } from './dto/list-notifications.dto';
import { UpdateNotificationPrefsDto } from './dto/update-notification-prefs.dto';
import { NotificationStreamService } from './notification-stream.service';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private readonly repo: Repository<Notification>,
    @InjectRepository(NotificationPreferences)
    private readonly prefsRepo: Repository<NotificationPreferences>,
    private readonly stream: NotificationStreamService,
  ) { }

  // -----------------------------------------------------------
  // PREFERENCIAS
  // -----------------------------------------------------------

  // Obtiene las preferencias del usuario (si no existen, devuelve por defecto todas habilitadas)
  async getPrefs(userId: number) {
    const existing = await this.prefsRepo.findOne({ where: { user: { id: userId } as any } });
    if (!existing) {
      return { userId, disabledTypes: [] as NotificationType[] };
    }
    const disabled = this.parseDisabled(existing.disabledTypesJson);
    return { userId, disabledTypes: disabled };
  }

  // Actualiza preferencias: persiste el array de tipos deshabilitados
  async updatePrefs(userId: number, dto: UpdateNotificationPrefsDto) {
    const disabled = dto.disabledTypes ?? [];
    let row = await this.prefsRepo.findOne({ where: { user: { id: userId } as any } });
    if (!row) {
      row = this.prefsRepo.create({
        user: { id: userId } as any,
        disabledTypesJson: JSON.stringify(disabled),
      });
    } else {
      row.disabledTypesJson = JSON.stringify(disabled);
    }
    await this.prefsRepo.save(row);
    return { ok: true, disabledTypes: disabled };
  }

  private parseDisabled(json?: string | null): NotificationType[] {
    if (!json) return [];
    try { return JSON.parse(json) ?? []; } catch { return []; }
  }

  // -----------------------------------------------------------
  // NOTIFY (aplica preferencias)
  // -----------------------------------------------------------

  // Crea notificaciones a partir de una transición de Request.
  // Aplica preferencias del destinatario: si el tipo está deshabilitado, no se crea.
  async notifyTransition(
    transition: RequestTransition,
    req: ServiceRequest,
    actorIdExplicit?: number | null,
  ): Promise<void> {
    const to = transition.toStatus;
    const type: NotificationType =
      (to === 'CANCELLED' && transition.notes === 'Admin cancel')
        ? NotificationType.ADMIN_CANCEL
        : (to as NotificationType);

    // Determinar targets en base a quién actuó
    const actorId = actorIdExplicit ?? transition.actor?.id ?? null;
    const targets = new Set<number>();
    if (actorId && req.client?.id === actorId) {
      if (req.provider?.id) targets.add(req.provider.id);
    } else if (actorId && req.provider?.id === actorId) {
      if (req.client?.id) targets.add(req.client.id);
    } else {
      if (req.client?.id) targets.add(req.client.id);
      if (req.provider?.id) targets.add(req.provider.id);
    }
    if (targets.size === 0) return;

    // Cargar preferencias de todos los destinatarios de una sola vez
    const targetIds = [...targets];
    const prefs = await this.prefsRepo.find({
      where: { user: { id: In(targetIds) } as any },
      relations: { user: true },
      select: { id: true, disabledTypesJson: true, user: { id: true } },
    });

    const disabledByUser = new Map<number, Set<NotificationType>>();
    for (const p of prefs) {
      const list = this.parseDisabled(p.disabledTypesJson);
      disabledByUser.set(p.user.id, new Set(list));
    }

    // Crear rows sólo para los que NO lo tienen deshabilitado
    const message = this.buildMessage(type, req);
    const rows: Notification[] = [];

    for (const uid of targetIds) {
      const userDisabled = disabledByUser.get(uid);
      if (userDisabled?.has(type)) continue; // filtrado por preferencia
      rows.push(this.repo.create({
        user: { id: uid } as any,
        request: { id: req.id } as any,
        transition: { id: transition.id } as any,
        type,
        message,
        seenAt: null,
      }));
    }

    if (!rows.length) return;

    const saved = await this.repo.save(rows);

    // Empujar por stream (opcional)
    for (const n of saved) {
      const payload = {
        id: n.id,
        type: n.type,
        message: n.message,
        requestId: (n.request as any)?.id ?? req.id,
        createdAt: n.createdAt,
      };
      this.stream.publish((n.user as any).id, payload);
    }
  }

  // Mensaje simple (luego se puede i18n)
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

  // -----------------------------------------------------------
  // LISTADO / BADGE / READ
  // -----------------------------------------------------------

  // Lista paginada de notificaciones del usuario actual (si unseen=true, sólo no leídas)
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
        id: true, type: true, message: true, seenAt: true, createdAt: true,
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
    await this.repo.update(
      { user: { id: userId } as any, seenAt: IsNull() },
      { seenAt: new Date() },
    );
    return { ok: true };
  }

  // Badge para UI: cantidad de no leídas
  async unseenCount(userId: number) {
    const total = await this.repo.count({ where: { user: { id: userId } as any, seenAt: IsNull() } });
    return { total };
  }

  // Borra UNA notificación si pertenece al usuario
  async removeOne(id: number, userId: number) {
    // // buscamos garantizando ownership
    const row = await this.repo.findOne({ where: { id, user: { id: userId } as any } });
    if (!row) throw new NotFoundException('Notification not found');

    await this.repo.delete({ id });
    return { ok: true, deletedId: id };
  }

  // Borra TODAS las notificaciones LEÍDAS del usuario
  async clearRead(userId: number) {
    // 1) Busco ids de las leídas para ese usuario
    const rows = await this.repo.find({
      select: { id: true },
      where: { user: { id: userId } as any, seenAt: Not(IsNull()) },
    });

    if (!rows.length) return { ok: true, deleted: 0 };

    // 2) Borro por ids (DB–agnóstico)
    const ids = rows.map(r => r.id);
    await this.repo.delete(ids);

    return { ok: true, deleted: ids.length };
  }

}
