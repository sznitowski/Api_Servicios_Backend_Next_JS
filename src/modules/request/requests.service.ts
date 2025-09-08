// src/modules/request/requests.service.ts
import {
    Injectable,
    BadRequestException,
    ForbiddenException,
    NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { ServiceRequest } from './request.entity';
import { CreateRequestDto } from './dto/create-request.dto';
import { ListMyRequestsDto } from './dto/list-my.dto';
import { RequestStatus } from './dto/mine.dto';
import { ServiceType } from '../catalog/service-types/service-type.entity';
import { User } from '../users/user.entity';
import { RequestTransition } from './request-transition.entity';

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
    ) { }

    /** -------------------- FEED PARA PROVEEDORES -------------------- */
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

            // Tipos que ofrece el proveedor (activos)
            .andWhere(
                `
        EXISTS (
          SELECT 1
          FROM provider_service_types pst
          WHERE pst.provider_id = :pid
            AND pst.service_type_id = r.service_type_id
            AND pst.active = 1
        )
      `,
                { pid: providerId },
            )

            // Aún no interactuó con ese request
            .andWhere(
                `
        NOT EXISTS (
          SELECT 1
          FROM request_transitions rt
          WHERE rt.request_id = r.id
            AND rt.actor_user_id = :pid2
        )
      `,
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
    /** --------------------------------------------------------------- */

    /** Helper para dejar un registro de transición */
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
        await this.trRepo.save(row);
    }

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
        // (opcional) asiento inicial PENDING->PENDING
        // await this.logTransition({ request: saved, from: 'PENDING', to: 'PENDING', actorId: clientId, priceOffered: saved.priceOffered });
        return saved;
    }

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

    async get(id: number) {
        const r = await this.repo.findOne({
            where: { id },
            relations: { client: true, provider: true, serviceType: true },
        });
        if (!r) throw new NotFoundException('Request not found');
        return r;
    }

    async claim(id: number, providerId: number, priceOffered?: number) {
        const r = await this.get(id);
        if (r.status !== 'PENDING') throw new BadRequestException('Only PENDING can be claimed');

        const provider = await this.userRepo.findOne({ where: { id: providerId } });
        if (!provider) throw new NotFoundException('Provider not found');

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

    async cancel(id: number, actorId: number) {
        const r = await this.get(id);

        const isActor = r.client.id === actorId || r.provider?.id === actorId;
        if (!isActor) throw new ForbiddenException('Not allowed');
        if (r.status === 'DONE') throw new BadRequestException('Cannot cancel DONE');

        const from: Status = r.status;
        r.status = 'CANCELLED';

        const saved = await this.repo.save(r);

        await this.logTransition({ request: saved, actorId, from, to: saved.status });

        return saved;
    }

    /** Historial (timeline) de un request */
    async timeline(requestId: number) {
        return this.trRepo.find({
            where: { request: { id: requestId } },
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

    async adminCancel(id: number, actorId: number) {
        const r = await this.get(id);
        r.status = 'CANCELLED';
        return this.repo.save(r);
    }


    async listMine(userId: number, q: ListMyRequestsDto) {
        const page = q.page ?? 1;
        const limit = q.limit ?? 20;

        const qb = this.repo.createQueryBuilder('r')
            .leftJoinAndSelect('r.client', 'client')
            .leftJoinAndSelect('r.provider', 'provider')
            .leftJoinAndSelect('r.serviceType', 'serviceType');

        if ((q.as ?? 'client') === 'provider') {
            // si tus columnas FK se llaman r.providerId/r.clientId, podés usar esas:
            qb.where('r.providerId = :uid', { uid: userId });
            // alternativa por relación:
            // qb.where('provider.id = :uid', { uid: userId });
        } else {
            qb.where('r.clientId = :uid', { uid: userId });
            // alternativa:
            // qb.where('client.id = :uid', { uid: userId });
        }

        if (q.status) qb.andWhere('r.status = :st', { st: q.status });

        qb.orderBy('r.createdAt', 'DESC')
            .skip((page - 1) * limit)
            .take(limit);

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
        status?: Status;        // usa el alias Status del propio servicio
        page?: number;          // ahora opcionales con default
        limit?: number;         // ahora opcionales con default
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

        qb.orderBy('r.createdAt', 'DESC')
            .skip((page - 1) * limit)
            .take(limit);

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
        // armamos el query agrupado por estado
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

        // normalizamos todos los estados conocidos a 0 si no vienen
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

}


