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
  ) { }

  // -----------------------------------------------------------
  // DTO helper para SSE
  // -----------------------------------------------------------
  private toDto(n: Notification) {
    return {
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
        : undefined,
    };
  }

  // -----------------------------------------------------------
  async markSeen(userId: number, ids?: number[], all?: boolean) {
    const where: any = { user: { id: userId } as any, seenAt: IsNull() };
    if (!all && ids?.length) where.id = In(ids);
    const res = await this.repo.update(where, { seenAt: new Date() });
    return res.affected ?? 0;
  }

  // -----------------------------------------------------------
  // Crear + Emitir (uso general)
  // -----------------------------------------------------------
  async createAndEmit(params: {
    userId: number;
    type: NotificationType;
    message: string;
    requestId?: number;
    transitionId?: number;
  }) {
    const notif = this.repo.create({
      type: params.type,
      message: params.message,
      user: { id: params.userId } as any,
      request: params.requestId ? ({ id: params.requestId } as any) : undefined,
      transition: params.transitionId ? ({ id: params.transitionId } as any) : undefined,
      seenAt: null,
    });
    const saved = await this.repo.save(notif);

    // Empujar por SSE
    try {
      this.stream.publish(params.userId, this.toDto(saved));
    } catch {
      /* noop */
    }

    return saved;
  }

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

    // Centralizamos en createAndEmit (ya emite por SSE)
    return await this.createAndEmit({
      userId,
      type,
      message,
      requestId: requestId ?? undefined,
    });
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

    const targetIds = [...targets];

    // 🔧 Cambio: traer preferencias **usuario por usuario** (más robusto en SQLite)
    const disabledByUser = new Map<number, Set<NotificationType>>();
    for (const uid of targetIds) {
      const p = await this.prefsRepo.findOne({
        where: { user: { id: uid } as any },
        relations: { user: true },
        select: { id: true, disabledTypesJson: true, user: { id: true } },
      });
      const list = this.parseDisabled(p?.disabledTypesJson);
      disabledByUser.set(uid, new Set(list));
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

    // Emitir 1×1 por SSE
    for (const n of saved) {
      this.stream.publish((n.user as any).id, this.toDto(n));
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

    // Traemos TODO (paginado) como antes…
    const [rows, totalRaw] = await this.repo.findAndCount({
      where,
      relations: { request: true, transition: true },
      order: { createdAt: 'DESC', id: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    // …pero aplicamos las preferencias del usuario para filtrar tipos deshabilitados
    const pref = await this.prefsRepo.findOne({
      where: { user: { id: userId } as any },
      relations: { user: true },
      select: { id: true, disabledTypesJson: true, user: { id: true } },
    });
    const disabled = this.parseDisabled(pref?.disabledTypesJson);
    const disabledSet = new Set(disabled);

    const filtered = rows.filter((n) => !disabledSet.has(n.type));

    const items = filtered.map((n) => ({
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

    // Ajustamos el total a lo filtrado (los specs no validan el total, pero queda consistente)
    const total = filtered.length;

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
