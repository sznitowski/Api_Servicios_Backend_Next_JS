// src/modules/notifications/notifications.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, IsNull, Not } from 'typeorm';

import { Notification, NotificationType } from './notification.entity';
import { NotificationPreferences } from './notification-preferences.entity';
import { RequestTransition } from '../request/request-transition.entity';
import { ServiceRequest } from '../request/request.entity';
import { ListNotificationsDto } from './dto/list-notifications.dto';
import { UpdateNotificationPrefsDto } from './dto/update-notification-prefs.dto';
import { NotificationStreamService } from './notification-stream.service';
import { User } from '../users/user.entity';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private readonly repo: Repository<Notification>,

    @InjectRepository(NotificationPreferences)
    private readonly prefsRepo: Repository<NotificationPreferences>,

    private readonly stream: NotificationStreamService,
  ) {}

  // ------------------------------------------------------------------
  // NOTIFICACIÓN MANUAL (ej. chat)
  // ------------------------------------------------------------------
  /**
   * Crea una notificación respetando preferencias.
   * Devuelve la notificación creada o `null` si el tipo está deshabilitado.
   */
  async createManual(params: {
    userId: number;
    requestId?: number | null;
    type: NotificationType;
    message: string;
  }): Promise<Notification | null> {
    const { userId, requestId, type, message } = params;

    // ⚠️ Incluir relations.user y seleccionar id para evitar DISTINCT/ORDER errors
    const pref = await this.prefsRepo.findOne({
      where: { user: { id: userId } as any },
      relations: { user: true },
      select: { id: true, disabledTypesJson: true, user: { id: true } },
    });

    const disabled = this.parseDisabled(pref?.disabledTypesJson);
    if (disabled.includes(type)) return null;

    // Crear fila por IDs (sin cargar entidades)
    const row = this.repo.create({
      user: { id: userId } as any,
      request: requestId ? ({ id: requestId } as any) : null,
      type,
      message,
      seenAt: null,
    });

    const saved = await this.repo.save(row);

    // Empujar por stream (no debe romper el flujo)
    try {
      this.stream?.publish?.(userId, {
        id: saved.id,
        type: saved.type,
        message: saved.message,
        requestId: requestId ?? (saved as any)?.request?.id ?? null,
        createdAt: saved.createdAt,
      });
    } catch {
      /* noop */
    }

    return saved;
  }

  // -----------------------------------------------------------
  // PREFERENCIAS
  // -----------------------------------------------------------
  async getPrefs(userId: number) {
    const existing = await this.prefsRepo.findOne({
      where: { user: { id: userId } as any },
    });
    if (!existing) return { userId, disabledTypes: [] as NotificationType[] };
    const disabled = this.parseDisabled(existing.disabledTypesJson);
    return { userId, disabledTypes: disabled };
  }

  async updatePrefs(userId: number, dto: UpdateNotificationPrefsDto) {
    const disabled = dto.disabledTypes ?? [];
    let row = await this.prefsRepo.findOne({
      where: { user: { id: userId } as any },
    });
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
    try {
      return JSON.parse(json) ?? [];
    } catch {
      return [];
    }
  }

  // -----------------------------------------------------------
  // NOTIFY a partir de transiciones de Request
  // -----------------------------------------------------------
  async notifyTransition(
    transition: RequestTransition,
    req: ServiceRequest,
    actorIdExplicit?: number | null,
  ): Promise<void> {
    const to = transition.toStatus;
    const type: NotificationType =
      to === 'CANCELLED' && transition.notes === 'Admin cancel'
        ? NotificationType.ADMIN_CANCEL
        : (to as NotificationType);

    // Destinatarios según quién actuó
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
    if (!targets.size) return;

    // Preferencias de todos los destinatarios
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

    const message = this.buildMessage(type, req);
    const rows: Notification[] = [];
    for (const uid of targetIds) {
      if (disabledByUser.get(uid)?.has(type)) continue;
      rows.push(
        this.repo.create({
          user: { id: uid } as any,
          request: { id: req.id } as any,
          transition: { id: transition.id } as any,
          type,
          message,
          seenAt: null,
        }),
      );
    }
    if (!rows.length) return;

    const saved = await this.repo.save(rows);

    // Stream
    for (const n of saved) {
      this.stream.publish((n.user as any).id, {
        id: n.id,
        type: n.type,
        message: n.message,
        requestId: (n.request as any)?.id ?? req.id,
        createdAt: n.createdAt,
      });
    }
  }

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

  // -----------------------------------------------------------
  // LISTADO / BADGE / READ / CLEAR
  // -----------------------------------------------------------
  async listForUser(userId: number, q: ListNotificationsDto) {
    const page = Math.max(1, Number(q.page ?? 1));
    const limit = Math.max(1, Math.min(Number(q.limit ?? 20), 50));
    const where: any = { user: { id: userId } };
    if (q.unseen) where.seenAt = IsNull();

    // ¡Sin `select` cuando hay `relations` para evitar ER_DUP_FIELDNAME!
    const [rows, total] = await this.repo.findAndCount({
      where,
      relations: { request: true, transition: true },
      order: { createdAt: 'DESC', id: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    const items = rows.map((n) => ({
      id: n.id,
      type: n.type,
      message: n.message,
      seenAt: n.seenAt,
      createdAt: n.createdAt,
      request: n.request
        ? {
            id: (n.request as any).id,
            title: (n.request as any).title,
            status: (n.request as any).status,
          }
        : null,
      transition: n.transition
        ? {
            id: (n.transition as any).id,
            fromStatus: (n.transition as any).fromStatus,
            toStatus: (n.transition as any).toStatus,
            createdAt: (n.transition as any).createdAt,
          }
        : null,
    }));

    return { items, meta: { page, limit, total, pages: Math.ceil(total / limit) } };
  }

  async markRead(id: number, userId: number) {
    const row = await this.repo.findOne({ where: { id, user: { id: userId } as any } });
    if (!row) throw new NotFoundException('Notification not found');
    if (!row.seenAt) {
      row.seenAt = new Date();
      await this.repo.save(row);
    }
    return { ok: true };
  }

  async markAll(userId: number) {
    await this.repo.update({ user: { id: userId } as any, seenAt: IsNull() }, { seenAt: new Date() });
    return { ok: true };
  }

  async unseenCount(userId: number) {
    const total = await this.repo.count({ where: { user: { id: userId } as any, seenAt: IsNull() } });
    return { total };
  }

  async removeOne(id: number, userId: number) {
    const row = await this.repo.findOne({ where: { id, user: { id: userId } as any } });
    if (!row) throw new NotFoundException('Notification not found');
    await this.repo.delete({ id });
    return { ok: true, deletedId: id };
  }

  async clearRead(userId: number) {
    const rows = await this.repo.find({
      select: { id: true },
      where: { user: { id: userId } as any, seenAt: Not(IsNull()) },
    });
    if (!rows.length) return { ok: true, deleted: 0 };
    const ids = rows.map((r) => r.id);
    await this.repo.delete(ids);
    return { ok: true, deleted: ids.length };
  }

  // -----------------------------------------------------------
  // API por entidades (se mantienen para uso desde otros servicios)
  // -----------------------------------------------------------
  async create(input: {
    type: NotificationType;
    user: User;
    request?: ServiceRequest | null;
    transition?: RequestTransition | null;
    message?: string | null;
  }) {
    // ⚠️ Incluir relations.user y seleccionar id para evitar DISTINCT/ORDER errors
    const pref = await this.prefsRepo.findOne({
      where: { user: { id: input.user.id } as any },
      relations: { user: true },
      select: { id: true, disabledTypesJson: true, user: { id: true } },
    });

    const disabled = this.parseDisabled(pref?.disabledTypesJson);
    if (disabled.includes(input.type)) return null;

    const notif = this.repo.create({
      type: input.type,
      user: input.user,
      request: input.request ?? null,
      transition: input.transition ?? null,
      message: input.message ?? null,
      seenAt: null,
    });
    return this.repo.save(notif);
  }
}
