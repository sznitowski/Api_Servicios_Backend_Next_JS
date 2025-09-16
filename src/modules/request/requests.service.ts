// src/modules/request/requests.service.ts
import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { ServiceRequest } from './request.entity';
import { CreateRequestDto } from './dto/create-request.dto';
import { ListMyRequestsDto } from './dto/list-my.dto';
import { ServiceType } from '../catalog/service-types/service-type.entity';
import { User, UserRole } from '../users/user.entity';
import { RequestTransition } from './request-transition.entity';
import { ListRequestsQueryDto } from './dto/list-requests.query.dto';

// NUEVOS DTOs reusables
import { MineQueryDto } from './dto/mine.dto';
import { CancelRequestDto } from './dto/cancel-request.dto';
import { NotificationsService } from '../notifications/notifications.service';

// Estados válidos para un Request (coinciden con la entidad)
type Status =
  | 'PENDING'
  | 'OFFERED'
  | 'ACCEPTED'
  | 'IN_PROGRESS'
  | 'DONE'
  | 'CANCELLED';

@Injectable()
export class RequestsService {
  constructor(
    @InjectRepository(ServiceRequest)
    private readonly repo: Repository<ServiceRequest>,

    @InjectRepository(RequestTransition)
    private readonly trRepo: Repository<RequestTransition>,

    @InjectRepository(ServiceType)
    private readonly stRepo: Repository<ServiceType>,

    @InjectRepository(User)
    private readonly userRepo: Repository<User>,

     private readonly notifications: NotificationsService,
  ) { }

  // ---------------------------------------------------------------------------
  // FEED PARA PROVEEDORES
  // ---------------------------------------------------------------------------
  /**
   * Devuelve pedidos abiertos (PENDING) cercanos para un proveedor.
   * - Filtra por radio usando Haversine (en KM)
   * - Excluye pedidos del propio proveedor
   * - Requiere que el proveedor ofrezca ese service_type (provider_service_types)
   * - Excluye pedidos con los que el proveedor ya interactuó (hay transición suya)
   */
  async feed(
    args: { lat: number; lng: number; radiusKm: number },
    providerId: number,
  ) {
    const { lat, lng, radiusKm } = args;

    // Haversine en KM (MySQL)
    const haversine = `
      6371 * 2 * ASIN(
        SQRT(
          POWER(SIN(RADIANS((r.lat - :lat) / 2)), 2) +
          COS(RADIANS(:lat)) * COS(RADIANS(r.lat)) *
          POWER(SIN(RADIANS((r.lng - :lng) / 2)), 2)
        )
      )
    `;

    const qb = this.repo
      .createQueryBuilder('r')
      .leftJoinAndSelect('r.client', 'client')
      .leftJoinAndSelect('r.serviceType', 'st')
      .addSelect(haversine, 'distance')
      .where('r.status = :pending', { pending: 'PENDING' })

      // No mostrar mis propios pedidos
      .andWhere('client.id <> :self', { self: providerId })

      // Tipos que ofrece el proveedor (activos)
      .andWhere(
        `EXISTS (
          SELECT 1
          FROM provider_service_types pst
          WHERE pst.provider_id = :pid
            AND pst.service_type_id = r.service_type_id
            AND pst.active = 1
        )`,
        { pid: providerId },
      )

      // Aún no interactuó con ese request
      .andWhere(
        `NOT EXISTS (
          SELECT 1
          FROM request_transitions rt
          WHERE rt.request_id = r.id
            AND rt.actor_user_id = :pid2
        )`,
        { pid2: providerId },
      )

      // Dentro del radio solicitado
      .andWhere(`${haversine} <= :radiusKm`, { lat, lng, radiusKm })
      .orderBy('distance', 'ASC')
      .limit(50);

    const { entities, raw } = await qb.getRawAndEntities();
    return entities.map((e, i) => ({
      ...e,
      distanceKm: Number(raw[i].distance),
    }));
  }

  // ---------------------------------------------------------------------------
  // TIMELINE / TRANSICIONES
  // ---------------------------------------------------------------------------
  /**
   * Helper interno para registrar una transición en el timeline.
   * Guarda: from -> to, actor, precios (si aplica) y notas (motivo libre).
   */


// Guarda la transición en DB y dispara notificaciones a los destinatarios
 private async logTransition(args: {
    request: ServiceRequest;
    actorId?: number;
    from: Status;
    to: Status;
    priceOffered?: string | null;
    priceAgreed?: string | null;
    notes?: string | null;
  }) {
    const row = this.trRepo.create({
      request: args.request,
      actor: args.actorId ? ({ id: args.actorId } as any) : null,
      fromStatus: args.from,
      toStatus: args.to,
      priceOffered: args.priceOffered ?? null,
      priceAgreed: args.priceAgreed ?? null,
      notes: args.notes ?? null,
    });

    const savedTransition = await this.trRepo.save(row);

    // 🔁 Re-cargamos el request con relaciones para notificaciones
    const reqForNotify = await this.repo.findOne({
      where: { id: args.request.id },
      relations: { client: true, provider: true },
    });
    if (!reqForNotify) return; // no rompemos el flujo si falló

    // ✅ Pasamos actorId explícito (por si la relación actor no viene cargada)
    await this.notifications.notifyTransition(savedTransition, reqForNotify, args.actorId ?? null);
  }



  /**
   * Historial (timeline) ordenado por fecha ascendente.
   * Incluye datos básicos del actor.
   */
  async timeline(requestId: number) {
    return this.trRepo.find({
      where: { request: { id: requestId } as any },
      order: { createdAt: 'ASC' },
      relations: { actor: true },
      select: {
        id: true,
        fromStatus: true,
        toStatus: true,
        priceOffered: true,
        priceAgreed: true,
        notes: true,
        createdAt: true,
        actor: { id: true, email: true, name: true, role: true },
      },
    });
  }

  // ---------------------------------------------------------------------------
  // CRUD BÁSICO DE REQUESTS
  // ---------------------------------------------------------------------------
  /**
   * Crea un Request PENDING a nombre de un cliente.
   */
  async create(dto: CreateRequestDto, clientId: number) {
    const serviceType = await this.stRepo.findOne({ where: { id: dto.serviceTypeId } });
    if (!serviceType) throw new NotFoundException('Service type not found');

    const client = await this.userRepo.findOne({ where: { id: clientId } });
    if (!client) throw new NotFoundException('Client not found');

    const r = this.repo.create({
      client,
      serviceType,
      title: dto.title,
      description: dto.description,
      address: dto.address,
      lat: dto.lat,
      lng: dto.lng,
      scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : null,
      priceOffered: dto.priceOffered != null ? String(dto.priceOffered) : null,
      status: 'PENDING',
    });

    const saved = await this.repo.save(r);
    return saved;
  }

  /**
   * Obtiene un request por id con relaciones principales.
   */
  async get(id: number) {
    const r = await this.repo.findOne({
      where: { id },
      relations: { client: true, provider: true, serviceType: true },
    });
    if (!r) throw new NotFoundException('Request not found');
    return r;
  }

  // ---------------------------------------------------------------------------
  // TRANSICIONES DE ESTADO (claim / accept / start / complete / cancel)
  // ---------------------------------------------------------------------------
  /**
   * claim: un proveedor se postula/ofrece para realizar un request.
   * Reglas:
   *  - No puede clamear su propio pedido
   *  - Solo PENDING puede pasar a OFFERED
   *  - Evita reclamos duplicados
   */
  async claim(id: number, providerId: number, priceOffered?: number) {
    const r = await this.get(id);

    if (r.client.id === providerId) {
      throw new ForbiddenException('Cannot claim your own request');
    }
    if (r.status !== 'PENDING') {
      throw new ConflictException('Request is not open to claim');
    }

    const provider = await this.userRepo.findOne({ where: { id: providerId } });
    if (!provider) throw new NotFoundException('Provider not found');

    if (r.provider && r.provider.id !== providerId) {
      throw new ConflictException('Already claimed by another provider');
    }
    if (r.provider && r.provider.id === providerId) {
      throw new ConflictException('Already claimed by you');
    }

    const from: Status = r.status;
    r.provider = provider;
    r.priceOffered = priceOffered != null ? String(priceOffered) : r.priceOffered ?? null;
    r.status = 'OFFERED';

    const saved = await this.repo.save(r);

    await this.logTransition({
      request: saved,
      actorId: providerId,
      from,
      to: saved.status,
      priceOffered: saved.priceOffered ?? null,
    });

    return saved;
  }

  /**
   * accept: el cliente acepta una oferta.
   * Reglas:
   *  - Solo OFFERED -> ACCEPTED
   *  - Puede registrar priceAgreed
   */
  async accept(id: number, clientId: number, priceAgreed?: number) {
    const r = await this.get(id);
    if (r.client.id !== clientId) throw new ForbiddenException('Not your request');
    if (r.status !== 'OFFERED') throw new BadRequestException('Only OFFERED can be accepted');

    const from: Status = r.status;
    if (priceAgreed != null) r.priceAgreed = String(priceAgreed);
    r.status = 'ACCEPTED';

    const saved = await this.repo.save(r);

    await this.logTransition({
      request: saved,
      actorId: clientId,
      from,
      to: saved.status,
      priceAgreed: saved.priceAgreed ?? null,
    });

    return saved;
  }

  /**
   * start: el proveedor inicia el trabajo.
   * Reglas:
   *  - Solo el proveedor asignado
   *  - Solo ACCEPTED -> IN_PROGRESS
   */
  async start(id: number, providerId: number) {
    const r = await this.get(id);
    if (!r.provider || r.provider.id !== providerId) throw new ForbiddenException('Not your assignment');
    if (r.status !== 'ACCEPTED') throw new BadRequestException('Only ACCEPTED can start');

    const from: Status = r.status;
    r.status = 'IN_PROGRESS';

    const saved = await this.repo.save(r);

    await this.logTransition({ request: saved, actorId: providerId, from, to: saved.status });

    return saved;
  }

  /**
   * complete: el proveedor marca el trabajo como finalizado.
   * Reglas:
   *  - Solo el proveedor asignado
   *  - Solo IN_PROGRESS -> DONE
   */
  async complete(id: number, providerId: number) {
    const r = await this.get(id);
    if (!r.provider || r.provider.id !== providerId) throw new ForbiddenException('Not your assignment');
    if (r.status !== 'IN_PROGRESS') throw new BadRequestException('Only IN_PROGRESS can be completed');

    const from: Status = r.status;
    r.status = 'DONE';

    const saved = await this.repo.save(r);

    await this.logTransition({ request: saved, actorId: providerId, from, to: saved.status });

    return saved;
  }

  /**
   * cancel: cancela un request con **motivo** y validación por **rol**.
   * Reglas por defecto:
   *  - CLIENTE puede cancelar: PENDING | OFFERED | ACCEPTED
   *  - PROVEEDOR puede cancelar: OFFERED | ACCEPTED
   *  - Nadie puede cancelar DONE
   * Guarda el motivo en las notas del timeline.
   */
  async cancel(
    id: number,
    actorId: number,
    actorRole: UserRole,
    dto?: CancelRequestDto,
  ) {
    const r = await this.get(id);

    const isClient = actorRole === UserRole.CLIENT;
    const isProv = actorRole === UserRole.PROVIDER;

    if (isClient && r.client.id !== actorId) {
      throw new ForbiddenException('You cannot cancel requests of other clients');
    }
    if (isProv && (!r.provider || r.provider.id !== actorId)) {
      throw new ForbiddenException('You are not the assigned provider');
    }
    if (r.status === 'DONE') throw new BadRequestException('Cannot cancel DONE');

    const allowClient = new Set<Status>(['PENDING', 'OFFERED', 'ACCEPTED']);
    const allowProv = new Set<Status>(['OFFERED', 'ACCEPTED']);
    const can =
      (isClient && allowClient.has(r.status)) ||
      (isProv && allowProv.has(r.status));

    if (!can) {
      throw new BadRequestException(`State ${r.status} is not cancellable for your role`);
    }

    const from: Status = r.status;
    r.status = 'CANCELLED';
    const saved = await this.repo.save(r);

    await this.logTransition({
      request: saved,
      actorId,
      from,
      to: saved.status,
      notes: dto?.reason ?? null,
    });

    return saved;
  }

  /**
   * adminCancel: fuerza cancelación por un usuario administrador
   * y deja rastro en timeline.
   */
  async adminCancel(id: number, adminUserId: number) {
    const r = await this.get(id);
    const from: Status = r.status;
    r.status = 'CANCELLED';
    const saved = await this.repo.save(r);

    await this.logTransition({
      request: saved,
      actorId: adminUserId,
      from,
      to: saved.status,
      notes: 'Admin cancel',
    });

    return saved;
  }

  // ---------------------------------------------------------------------------
  // LISTADOS: CLIENTE / PROVEEDOR / ABIERTOS / MIS SOLICITUDES
  // ---------------------------------------------------------------------------
  /**
   * listByClient: listado paginado de requests del cliente actual.
   */
  async listByClient(clientId: number, q: ListRequestsQueryDto) {
    const page = Math.max(1, Number(q.page ?? 1));
    const limit = Math.min(50, Math.max(1, Number(q.limit ?? 20)));

    const where: any = { client: { id: clientId } };
    if (q.status) where.status = q.status;

    const [rows, total] = await this.repo.findAndCount({
      where,
      relations: { client: true, provider: true, serviceType: true },
      order: { createdAt: 'DESC', id: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      items: rows,
      meta: { page, limit, total, pages: Math.ceil(total / limit) },
    };
  }

  /**
   * listByProvider: listado paginado de requests asignados al proveedor actual.
   */
  async listByProvider(providerUserId: number, q: ListRequestsQueryDto) {
    const page = Math.max(1, Number(q.page ?? 1));
    const limit = Math.min(50, Math.max(1, Number(q.limit ?? 20)));

    const where: any = { provider: { id: providerUserId } };
    if (q.status) where.status = q.status;

    const [rows, total] = await this.repo.findAndCount({
      where,
      relations: { client: true, provider: true, serviceType: true },
      order: { createdAt: 'DESC', id: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      items: rows,
      meta: { page, limit, total, pages: Math.ceil(total / limit) },
    };
  }

  /**
   * open: pedidos abiertos cerca (paginado) para el proveedor actual.
   * Soporta sort por 'distance' o 'createdAt' y filtro por serviceTypeId.
   */
  async open(
    q: {
      lat: number;
      lng: number;
      radiusKm?: number;
      page?: number;
      limit?: number;
      serviceTypeId?: number;
      sort?: 'distance' | 'createdAt';
    },
    providerId: number,
  ) {
    const lat = Number(q.lat);
    const lng = Number(q.lng);
    const radiusKm = q.radiusKm ?? 10;
    const page = Math.max(1, q.page ?? 1);
    const limit = Math.max(1, Math.min(q.limit ?? 20, 50));

    const haversine = `
      6371 * 2 * ASIN(
        SQRT(
          POWER(SIN(RADIANS((r.lat - :lat) / 2)), 2) +
          COS(RADIANS(:lat)) * COS(RADIANS(r.lat)) *
          POWER(SIN(RADIANS((r.lng - :lng) / 2)), 2)
        )
      )
    `;

    const qb = this.repo
      .createQueryBuilder('r')
      .leftJoinAndSelect('r.client', 'client')
      .leftJoinAndSelect('r.serviceType', 'st')
      .addSelect(haversine, 'distance')
      .where('r.status = :pending', { pending: 'PENDING' })
      .andWhere('client.id <> :self', { self: providerId })
      .andWhere(
        `EXISTS (
           SELECT 1
           FROM provider_service_types pst
           WHERE pst.provider_id = :pid
             AND pst.service_type_id = r.service_type_id
             AND pst.active = 1
         )`,
        { pid: providerId },
      )
      .andWhere(`${haversine} <= :radiusKm`, { lat, lng, radiusKm });

    if (q.serviceTypeId) {
      qb.andWhere('st.id = :stId', { stId: q.serviceTypeId });
    }

    if (q.sort === 'createdAt') {
      qb.orderBy('r.createdAt', 'DESC').addOrderBy('distance', 'ASC');
    } else {
      qb.orderBy('distance', 'ASC').addOrderBy('r.createdAt', 'DESC');
    }

    qb.skip((page - 1) * limit).take(limit);

    const [rawAndEntities, total] = await Promise.all([
      qb.getRawAndEntities(),
      qb.getCount(),
    ]);

    const { entities, raw } = rawAndEntities;
    const items = entities.map((e, i) => ({
      ...e,
      distanceKm: Number(raw[i].distance),
    }));

    return {
      items,
      meta: {
        page,
        limit,
        total,
        pages: Math.max(1, Math.ceil(total / Math.max(limit, 1))),
      },
    };
  }

  // ---------------------------------------------------------------------------
  // NUEVA IMPLEMENTACIÓN: "MIS SOLICITUDES" con MineQueryDto
  // ---------------------------------------------------------------------------
  /**
   * listMineByRole: listado “mis solicitudes” reutilizando MineQueryDto.
   * - as: 'client' | 'provider' (si no viene, se infiere por rol del usuario)
   * - status: filtro opcional por estado
   * - page/limit: paginado estándar
   * Devuelve items “sanitizados” + meta.
   */
  async listMineByRole(userId: number, userRole: UserRole, q: MineQueryDto) {
    const as: 'client' | 'provider' =
      q.as ?? (userRole === UserRole.PROVIDER ? 'provider' : 'client');

    const qb = this.repo
      .createQueryBuilder('r')
      .leftJoinAndSelect('r.serviceType', 'st')
      .leftJoinAndSelect('r.client', 'cli')
      .leftJoinAndSelect('r.provider', 'prov');

    if (as === 'client') qb.where('cli.id = :uid', { uid: userId });
    else qb.where('prov.id = :uid', { uid: userId });

    if (q.status) qb.andWhere('r.status = :st', { st: q.status });

    const page = q.page ?? 1;
    const limit = q.limit ?? 10;

    qb.orderBy('r.updatedAt', 'DESC').skip((page - 1) * limit).take(limit);

    const [rows, total] = await qb.getManyAndCount();

    return {
      items: rows.map((r) => ({
        id: r.id,
        status: r.status,
        title: r.title,
        address: r.address,
        scheduledAt: r.scheduledAt,
        priceOffered: r.priceOffered,
        priceAgreed: r.priceAgreed,
        serviceType: r.serviceType ? { id: r.serviceType.id, name: r.serviceType.name } : null,
        client: r.client ? { id: r.client.id, email: r.client.email } : null,
        provider: r.provider ? { id: r.provider.id, email: r.provider.email } : null,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
      })),
      meta: { page, limit, total, pages: Math.ceil(total / limit) },
    };
  }

  // ---------------------------------------------------------------------------
  // LEGADO / AUX (se mantienen para compatibilidad con controladores actuales)
  // ---------------------------------------------------------------------------

  /** LEGACY: listado de mis requests usando ListMyRequestsDto. */
  async listMine(userId: number, q: ListMyRequestsDto) {
    const page = q.page ?? 1;
    const limit = q.limit ?? 20;

    const qb = this.repo
      .createQueryBuilder('r')
      .leftJoinAndSelect('r.client', 'client')
      .leftJoinAndSelect('r.provider', 'provider')
      .leftJoinAndSelect('r.serviceType', 'serviceType');

    if ((q.as ?? 'client') === 'provider') {
      qb.where('r.providerId = :uid', { uid: userId });
    } else {
      qb.where('r.clientId = :uid', { uid: userId });
    }

    if (q.status) qb.andWhere('r.status = :st', { st: q.status });

    qb.orderBy('r.createdAt', 'DESC').skip((page - 1) * limit).take(limit);

    const [items, total] = await qb.getManyAndCount();
    return { items, total, page, limit };
  }

  /** LEGACY: variante con shape de respuesta paginada. */
  async mine({
    userId,
    as,
    status,
    page = 1,
    limit = 10,
  }: {
    userId: number;
    as: 'client' | 'provider';
    status?: Status;
    page?: number;
    limit?: number;
  }) {
    const qb = this.repo
      .createQueryBuilder('r')
      .leftJoinAndSelect('r.client', 'client')
      .leftJoinAndSelect('r.provider', 'provider')
      .leftJoinAndSelect('r.serviceType', 'serviceType');

    if (as === 'client') {
      qb.where('client.id = :userId', { userId });
    } else {
      qb.where('provider.id = :userId', { userId });
    }

    if (status) {
      qb.andWhere('r.status = :status', { status });
    }

    qb.orderBy('r.createdAt', 'DESC').skip((page - 1) * limit).take(limit);

    const [items, total] = await qb.getManyAndCount();

    return {
      items,
      meta: {
        total,
        page,
        limit,
        pages: Math.max(1, Math.ceil(total / Math.max(limit, 1))),
      },
    };
  }

  /** LEGACY: resumen de mis requests agrupado por estado. */
  async mineSummary({
    userId,
    as,
  }: {
    userId: number;
    as: 'client' | 'provider';
  }) {
    const qb = this.repo
      .createQueryBuilder('r')
      .select('r.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .leftJoin('r.client', 'client')
      .leftJoin('r.provider', 'provider');

    if (as === 'client') {
      qb.where('client.id = :userId', { userId });
    } else {
      qb.where('provider.id = :userId', { userId });
    }

    const rows = await qb.groupBy('r.status').getRawMany<{ status: Status; count: string }>();

    const counts: Record<Status, number> = {
      PENDING: 0,
      OFFERED: 0,
      ACCEPTED: 0,
      IN_PROGRESS: 0,
      DONE: 0,
      CANCELLED: 0,
    };

    for (const r of rows) counts[r.status] = Number(r.count);
    const total = Object.values(counts).reduce((a, b) => a + b, 0);

    return { ...counts, total };
  }

  // ---------------------------------------------------------------------------
  // Consultas rápidas auxiliares (se mantienen)
  // ---------------------------------------------------------------------------
  /** LEGACY: lista “mis pedidos como cliente” (ordenado) */
  findMyClient(clientId: number) {
    return this.repo.find({
      where: { client: { id: clientId } },
      order: { createdAt: 'DESC' },
      relations: { client: true, provider: true, serviceType: true },
    });
  }

  /** LEGACY: lista “mis pedidos como proveedor asignado” (ordenado) */
  findMyProvider(providerId: number) {
    return this.repo.find({
      where: { provider: { id: providerId } },
      order: { createdAt: 'DESC' },
      relations: { client: true, provider: true, serviceType: true },
    });
  }
}
