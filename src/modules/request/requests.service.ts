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
            // DTO -> number; entidad -> string | null
            priceOffered: dto.priceOffered != null ? String(dto.priceOffered) : null,
            status: 'PENDING',
        });

        const saved = await this.repo.save(r);

        // (opcional) dejar un asiento de creación como PENDING->PENDING
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
        r.priceOffered = priceOffered != null ? String(priceOffered) : (r.priceOffered ?? null);
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
                actor: { id: true, email: true, name: true, role: true }, // <- solo estos
            },
        });
    }

    async adminCancel(id: number, actorId: number) {
        const r = await this.get(id);
        // permitir desde cualquier estado
        r.status = 'CANCELLED';
        return this.repo.save(r);
    }

}
