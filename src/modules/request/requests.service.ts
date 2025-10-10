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

// ⚡ NUEVO: entidad para Idempotency-Key
import { RequestIdempotencyKey } from './request.entity';

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

    // ⚡ NUEVO: repo de claves idempotentes
    @InjectRepository(RequestIdempotencyKey)
    private readonly idemRepo: Repository<RequestIdempotencyKey>,

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
   * - Si el pedido está “apuntado” a un proveedor (providerId), sólo lo ve ese proveedor
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
      .andWhere(
        `NOT EXISTS (
          SELECT 1
          FROM request_transitions rt
          WHERE rt.request_id = r.id
            AND rt.actor_user_id = :pid2
        )`,
        { pid2: providerId },
      )
      .andWhere('(r.provider_id IS NULL OR r.provider_id = :self2)', {
        self2: providerId,
      })
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

  // Guarda transición + notifica
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

    // Re-cargamos el request para notificaciones
    const reqForNotify = await this.repo.findOne({
      where: { id: args.request.id },
      relations: { client: true, provider: true },
    });
    if (!reqForNotify) return;

    await this.notifications.notifyTransition(
      savedTransition,
      reqForNotify,
      args.actorId ?? null,
    );
  }

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
  // CRUD BÁSICO + **NUEVO** createIdempotent
  // ---------------------------------------------------------------------------

  /**
   * Crea un Request PENDING normal (sin idempotencia).
   * Si viene `providerUserId`, se asigna ese proveedor pero sigue PENDING.
   */
  async create(dto: CreateRequestDto, clientId: number) {
    const serviceType = await this.stRepo.findOne({
      where: { id: dto.serviceTypeId },
    });
    if (!serviceType) throw new NotFoundException('Service type not found');

    const client = await this.userRepo.findOne({ where: { id: clientId } });
    if (!client) throw new NotFoundException('Client not found');

    let provider: User | null = null;
    if (dto.providerUserId != null) {
      provider = await this.userRepo.findOne({
        where: { id: dto.providerUserId },
      });
      if (!provider) throw new NotFoundException('Provider not found');
      if (provider.id === client.id) {
        throw new BadRequestException(
          'Client and provider cannot be the same user',
        );
      }
    }

    const r = this.repo.create({
      client,
      provider: provider ?? null,
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

    return this.repo.save(r);
  }

  /**
   * **Nuevo**: Crea un Request de forma **idempotente** usando `idempotencyKey`.
   * - Si `idempotencyKey` es `undefined` → se comporta como `create()`.
   * - Si la clave ya existe → devuelve el mismo request (sin duplicar).
   * - Con transacción + UNIQUE en `request_idempotency_keys.key`
   *   (si hay carrera y choca `ER_DUP_ENTRY`, buscamos y devolvemos el existente).
   */
  async createIdempotent(
    dto: CreateRequestDto,
    clientId: number,
    idempotencyKey?: string,
  ) {
    // Sin clave → creación normal
    if (!idempotencyKey) return this.create(dto, clientId);

    const normalizedKey = String(idempotencyKey).slice(0, 100).trim();

    return this.repo.manager.transaction(async (em) => {
      const idemRepo = em.getRepository(RequestIdempotencyKey);
      const reqRepo = em.getRepository(ServiceRequest);
      const stRepo = em.getRepository(ServiceType);
      const userRepo = em.getRepository(User);

      // 1) Si la clave ya existe, devolvemos el request asociado
      const existingKey = await idemRepo.findOne({
        where: { key: normalizedKey },
        relations: { request: true },
      });
      if (existingKey) {
        const r = await reqRepo.findOne({
          where: { id: existingKey.request.id },
          relations: { client: true, provider: true, serviceType: true },
        });
        if (!r) throw new NotFoundException('Request not found for key');
        return r; // reintento: devolvemos el mismo
      }

      // 2) Creamos el request
      const serviceType = await stRepo.findOne({
        where: { id: dto.serviceTypeId },
      });
      if (!serviceType) throw new NotFoundException('Service type not found');

      const client = await userRepo.findOne({ where: { id: clientId } });
      if (!client) throw new NotFoundException('Client not found');

      let provider: User | null = null;
      if (dto.providerUserId != null) {
        provider = await userRepo.findOne({
          where: { id: dto.providerUserId },
        });
        if (!provider) throw new NotFoundException('Provider not found');
        if (provider.id === client.id) {
          throw new BadRequestException(
            'Client and provider cannot be the same user',
          );
        }
      }

      const r = reqRepo.create({
        client,
        provider: provider ?? null,
        serviceType,
        title: dto.title,
        description: dto.description,
        address: dto.address,
        lat: dto.lat,
        lng: dto.lng,
        scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : null,
        priceOffered:
          dto.priceOffered != null ? String(dto.priceOffered) : null,
        status: 'PENDING',
      });

      const saved = await reqRepo.save(r);

      // 3) Guardamos la clave → UNIQUE(key)
      const k = idemRepo.create({
        key: normalizedKey,
        user: { id: clientId } as any,
        request: saved,
      });

      try {
        await idemRepo.save(k);
      } catch (e: any) {
        // Carrera: si otro proceso insertó la misma key justo antes
        if (e?.code === 'ER_DUP_ENTRY') {
          const again = await idemRepo.findOne({
            where: { key: normalizedKey },
            relations: { request: true },
          });
          if (again?.request) {
            const same = await reqRepo.findOne({
              where: { id: again.request.id },
              relations: { client: true, provider: true, serviceType: true },
            });
            if (same) return same;
          }
        }
        throw e;
      }

      return saved;
    });
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
  // TRANSICIONES (claim / accept / start / complete / cancel)
  // ---------------------------------------------------------------------------

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
    r.priceOffered =
      priceOffered != null ? String(priceOffered) : r.priceOffered ?? null;
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

  async accept(id: number, clientId: number, priceAgreed?: number) {
    const r = await this.get(id);
    if (r.client.id !== clientId)
      throw new ForbiddenException('Not your request');
    if (r.status !== 'OFFERED')
      throw new BadRequestException('Only OFFERED can be accepted');

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

  async start(id: number, providerId: number) {
    const r = await this.get(id);
    if (!r.provider || r.provider.id !== providerId)
      throw new ForbiddenException('Not your assignment');
    if (r.status !== 'ACCEPTED')
      throw new BadRequestException('Only ACCEPTED can start');

    const from: Status = r.status;
    r.status = 'IN_PROGRESS';

    const saved = await this.repo.save(r);

    await this.logTransition({
      request: saved,
      actorId: providerId,
      from,
      to: saved.status,
    });

    return saved;
  }

  async complete(id: number, providerId: number) {
    const r = await this.get(id);
    if (!r.provider || r.provider.id !== providerId)
      throw new ForbiddenException('Not your assignment');
    if (r.status !== 'IN_PROGRESS')
      throw new BadRequestException('Only IN_PROGRESS can be completed');

    const from: Status = r.status;
    r.status = 'DONE';

    const saved = await this.repo.save(r);

    await this.logTransition({
      request: saved,
      actorId: providerId,
      from,
      to: saved.status,
    });

    return saved;
  }

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
      throw new ForbiddenException(
        'You cannot cancel requests of other clients',
      );
    }
    if (isProv && (!r.provider || r.provider.id !== actorId)) {
      throw new ForbiddenException('You are not the assigned provider');
    }
    if (r.status === 'DONE')
      throw new BadRequestException('Cannot cancel DONE');

    const allowClient = new Set<Status>(['PENDING', 'OFFERED', 'ACCEPTED']);
    const allowProv = new Set<Status>(['OFFERED', 'ACCEPTED']);
    const can =
      (isClient && allowClient.has(r.status)) ||
      (isProv && allowProv.has(r.status));

    if (!can) {
      throw new BadRequestException(
        `State ${r.status} is not cancellable for your role`,
      );
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
  // LISTADOS
  // ---------------------------------------------------------------------------

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
   * - sort por 'distance' o 'createdAt'
   * - filtro por serviceTypeId
   * - “apuntados” sólo visibles por su proveedor
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
      .andWhere('(r.provider_id IS NULL OR r.provider_id = :self2)', {
        self2: providerId,
      })
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
  // “MIS SOLICITUDES” (unificado)
  // ---------------------------------------------------------------------------
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
        serviceType: r.serviceType
          ? { id: r.serviceType.id, name: r.serviceType.name }
          : null,
        client: r.client ? { id: r.client.id, email: r.client.email } : null,
        provider: r.provider ? { id: r.provider.id, email: r.provider.email } : null,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
      })),
      meta: { page, limit, total, pages: Math.ceil(total / limit) },
    };
  }

  // ---------------------------------------------------------------------------
  // LEGADO / AUX
  // ---------------------------------------------------------------------------

  async listMine(userId: number, q: ListMyRequestsDto) {
    const page = q.page ?? 1;
    const limit = q.limit ?? 20;

    const qb = this.repo
      .createQueryBuilder('r')
      .leftJoinAndSelect('r.client', 'client')
      .leftJoinAndSelect('r.provider', 'provider')
      .leftJoinAndSelect('r.serviceType', 'serviceType');

  if ((q.as ?? 'client') === 'provider') {
  qb.where('provider.id = :uid', { uid: userId });
} else {
  qb.where('client.id = :uid', { uid: userId });
}


    if (q.status) qb.andWhere('r.status = :st', { st: q.status });

    qb.orderBy('r.createdAt', 'DESC').skip((page - 1) * limit).take(limit);

    const [items, total] = await qb.getManyAndCount();
    return { items, total, page, limit };
  }

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

    const rows = await qb
      .groupBy('r.status')
      .getRawMany<{ status: Status; count: string }>();

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
  // Consultas rápidas auxiliares
  // ---------------------------------------------------------------------------
  findMyClient(clientId: number) {
    return this.repo.find({
      where: { client: { id: clientId } },
      order: { createdAt: 'DESC' },
      relations: { client: true, provider: true, serviceType: true },
    });
  }

  findMyProvider(providerId: number) {
    return this.repo.find({
      where: { provider: { id: providerId } },
      order: { createdAt: 'DESC' },
      relations: { client: true, provider: true, serviceType: true },
    });
  }

  offer(id: number, providerId: number, priceOffered?: number) {
    return this.claim(id, providerId, priceOffered);
  }
  done(id: number, providerId: number) {
    return this.complete(id, providerId);
  }
}
