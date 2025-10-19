import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { RequestRating } from './request-rating.entity';
import { ServiceRequest } from '../request/request.entity';
import { ProviderProfile } from '../providers/provider-profile.entity';
import { User } from '../users/user.entity';
import { CreateRatingDto } from './dto/create-rating.dto';

@Injectable()
export class RatingsService {
  constructor(
    @InjectRepository(RequestRating)
    private readonly ratingRepo: Repository<RequestRating>,
    @InjectRepository(ServiceRequest)
    private readonly reqRepo: Repository<ServiceRequest>,
    @InjectRepository(ProviderProfile)
    private readonly provRepo: Repository<ProviderProfile>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  /**
   * Cliente -> Proveedor
   * Crea UNA sola calificación por request y par (cliente, proveedor).
   * Si ya existe, devuelve 409 (o 400 según tu preferencia).
   */
  async rateRequest(
    requestId: number,
    clientId: number,
    dto: CreateRatingDto,
  ) {
    const req = await this.reqRepo.findOne({
      where: { id: requestId },
      relations: { client: true, provider: true },
    });
    if (!req) throw new NotFoundException('Request not found');
    if (req.status !== 'DONE')
      throw new BadRequestException('Request is not done yet');
    if (!req.provider) throw new BadRequestException('No provider assigned');
    if (req.client.id !== clientId)
      throw new ForbiddenException(
        'Only the client can rate this request',
      );

    // Buscar EXISTENTE por (request + rater + ratee) para este sentido cliente->proveedor
    const already = await this.ratingRepo.findOne({
      where: {
        request: { id: requestId } as any,
        rater: { id: clientId } as any,
        ratee: { id: req.provider.id } as any,
      },
    });
    if (already) {
      // Antes se hacía upsert; el test requiere bloquear el 2º intento
      throw new ConflictException('Already rated');
    }

    const saved = await this.ratingRepo.save(
      this.ratingRepo.create({
        request: { id: requestId } as any,
        rater: { id: clientId } as any, // cliente califica
        ratee: { id: req.provider.id } as any, // proveedor calificado
        score: dto.stars,
        comment: dto.comment ?? null,
      }),
    );

    // Actualizar métricas del proveedor
    const profile = await this.provRepo.findOne({
      where: { user: { id: req.provider.id } as any },
      relations: { user: true },
    });
    if (profile) {
      const prevCount = profile.ratingCount ?? 0;
      const prevAvg = Number(profile.ratingAvg ?? 0);
      const newAvg = ((prevAvg * prevCount) + dto.stars) / (prevCount + 1);
      profile.ratingCount = prevCount + 1;
      profile.ratingAvg = newAvg.toFixed(2);
      await this.provRepo.save(profile);
    }

    return saved;
  }

  async getByRequest(requestId: number) {
    const rows = await this.ratingRepo.find({
      where: { request: { id: requestId } as any },
      relations: { rater: true, ratee: true, request: true },
      order: { createdAt: 'DESC' },
      take: 1,
    });
    return rows[0] ?? null;
  }

  async listByProvider(
    providerUserId: number,
    opts: { page?: number; limit?: number; requestId?: number },
  ) {
    const page = Math.max(1, opts.page ?? 1);
    const limit = Math.min(50, Math.max(1, opts.limit ?? 10));

    const qb = this.ratingRepo
      .createQueryBuilder('r')
      .leftJoinAndSelect('r.rater', 'rater')
      .leftJoin('r.ratee', 'ratee')
      .leftJoinAndSelect('r.request', 'request')
      .where('ratee.id = :uid', { uid: providerUserId });

    if (opts.requestId) qb.andWhere('request.id = :rid', { rid: opts.requestId });

    qb.orderBy('r.createdAt', 'DESC').skip((page - 1) * limit).take(limit);

    const [items, total] = await qb.getManyAndCount();
    return {
      items,
      meta: { page, limit, total, pages: Math.ceil(total / limit) },
    };
  }

  async summaryForProvider(providerUserId: number) {
    const rows = await this.ratingRepo
      .createQueryBuilder('r')
      .select('r.score', 'score')
      .addSelect('COUNT(*)', 'count')
      .innerJoin('r.ratee', 'ratee')
      .where('ratee.id = :uid', { uid: providerUserId })
      .groupBy('r.score')
      .getRawMany();

    const b: Record<string, number> = {
      '1': 0,
      '2': 0,
      '3': 0,
      '4': 0,
      '5': 0,
    };
    for (const row of rows) b[String(row.score)] = Number(row.count);

    const profile = await this.provRepo.findOne({
      where: { user: { id: providerUserId } as any },
    });

    return {
      ratingAvg: Number(profile?.ratingAvg ?? 0),
      ratingCount: profile?.ratingCount ?? 0,
      breakdown: {
        '5': b['5'],
        '4': b['4'],
        '3': b['3'],
        '2': b['2'],
        '1': b['1'],
      },
    };
  }

  private async recomputeProviderStats(providerUserId: number) {
    const row = await this.ratingRepo
      .createQueryBuilder('r')
      .select('AVG(r.score)', 'avg')
      .addSelect('COUNT(*)', 'cnt')
      .innerJoin('r.ratee', 'ratee')
      .where('ratee.id = :uid', { uid: providerUserId })
      .getRawOne<{ avg: string | null; cnt: string }>();

    const profile = await this.provRepo.findOne({
      where: { user: { id: providerUserId } as any },
      relations: { user: true },
    });
    if (!profile) return;
    profile.ratingAvg = Number(row?.avg ?? 0).toFixed(2);
    profile.ratingCount = Number(row?.cnt ?? 0);
    await this.provRepo.save(profile);
  }

  /**
   * Proveedor -> Cliente
   * Si ya existe una calificación para ese (request + provider -> client),
   * devolvemos 409 para mantener la simetría.
   */
  async rateClient(
    requestId: number,
    providerId: number,
    dto: CreateRatingDto,
  ) {
    const req = await this.reqRepo.findOne({
      where: { id: requestId },
      relations: { client: true, provider: true },
    });
    if (!req) throw new NotFoundException('Request not found');
    if (req.status !== 'DONE')
      throw new BadRequestException('Request is not done yet');
    if (!req.provider || req.provider.id !== providerId) {
      throw new ForbiddenException(
        'Only the assigned provider can rate this request',
      );
    }

    const existing = await this.ratingRepo.findOne({
      where: {
        request: { id: requestId } as any,
        rater: { id: providerId } as any, // proveedor califica
        ratee: { id: req.client.id } as any, // cliente calificado
      },
    });

    if (existing) {
      throw new ConflictException('Already rated');
    }

    return this.ratingRepo.save(
      this.ratingRepo.create({
        request: { id: requestId } as any,
        rater: { id: providerId } as any,
        ratee: { id: req.client.id } as any,
        score: dto.stars,
        comment: dto.comment ?? null,
      }),
    );
  }

  // Proveedor -> Cliente (lectura para vista del cliente)
  async getClientRatingByRequest(requestId: number) {
    const req = await this.reqRepo.findOne({
      where: { id: requestId },
      relations: { client: true, provider: true },
    });
    if (!req) throw new NotFoundException('Request not found');

    const rows = await this.ratingRepo.find({
      where: {
        request: { id: requestId } as any,
        rater: { id: req.provider?.id } as any,
        ratee: { id: req.client.id } as any,
      },
      relations: { rater: true, ratee: true, request: true },
      order: { createdAt: 'DESC' },
      take: 1,
    });

    return rows[0] ?? null;
  }
}
