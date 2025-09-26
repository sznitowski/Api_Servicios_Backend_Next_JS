// src/modules/ragings/ratings.service.ts
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
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
    private readonly userRepo: Repository<User>, // reservado por si luego validamos más cosas
  ) { }

  /** Cliente califica un request finalizado. */
  async rateRequest(requestId: number, clientId: number, dto: CreateRatingDto) {
    // 1) Traer el request con client y provider
    const req = await this.reqRepo.findOne({
      where: { id: requestId },
      relations: { client: true, provider: true },
    });
    if (!req) throw new NotFoundException('Request not found');

    // estado final esperado
    if (req.status !== 'DONE') {
      throw new BadRequestException('Request is not done yet');
    }

    if (!req.provider) throw new BadRequestException('No provider assigned');
    if (req.client.id !== clientId) {
      throw new ForbiddenException('Only the client can rate this request');
    }

    // 2) Si ya existe un rating para este request, lo actualizamos (idempotente)
    const already = await this.ratingRepo.findOne({
      where: { request: { id: requestId } as any },
    });

    if (already) {
      already.score = dto.stars;
      already.comment = dto.comment ?? null;
      await this.ratingRepo.save(already);

      // Recalcular stats del proveedor
      await this.recomputeProviderStats(req.provider.id);
      return already;
    }


    // 3) Crear el rating (rater = cliente, ratee = proveedor)
    const payload = this.ratingRepo.create({
      request: { id: requestId } as any,
      rater: { id: clientId } as any,
      ratee: { id: req.provider.id } as any,
      score: dto.stars,              // mapeamos stars -> score
      comment: dto.comment ?? null,
    });
    const saved = await this.ratingRepo.save(payload);

    // 4) Actualizar promedio/cantidad del ProviderProfile (user_id del proveedor)
    const provProfile = await this.provRepo.findOne({
      where: { user: { id: req.provider.id } as any },
      relations: { user: true },
    });

    if (provProfile) {
      const prevCount = provProfile.ratingCount ?? 0;
      const prevAvg = Number(provProfile.ratingAvg ?? 0);
      const newAvg = ((prevAvg * prevCount) + dto.stars) / (prevCount + 1);

      provProfile.ratingCount = prevCount + 1;
      provProfile.ratingAvg = newAvg.toFixed(2); // DECIMAL guardado como string
      await this.provRepo.save(provProfile);
    }

    return saved;
  }

  /** Listar ratings recibidos por un proveedor (filtra por user_id del proveedor). */
  async listByProvider(
    providerUserId: number,
    opts: { page?: number; limit?: number },
  ) {
    const page = Math.max(1, opts.page ?? 1);
    const limit = Math.min(50, Math.max(1, opts.limit ?? 10));

    const qb = this.ratingRepo
      .createQueryBuilder('r')
      .leftJoinAndSelect('r.rater', 'rater')   // quién calificó
      .leftJoin('r.ratee', 'ratee')            // quién recibió
      .where('ratee.id = :uid', { uid: providerUserId })
      .orderBy('r.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [items, total] = await qb.getManyAndCount();
    return { items, meta: { page, limit, total, pages: Math.ceil(total / limit) } };
  }

  /** Resumen (promedio, cantidad y breakdown 1..5) del proveedor por user_id. */
  async summaryForProvider(providerUserId: number) {
    // Breakdown directo desde la tabla de ratings (score 1..5)
    const rows = await this.ratingRepo
      .createQueryBuilder('r')
      .select('r.score', 'score')
      .addSelect('COUNT(*)', 'count')
      .innerJoin('r.ratee', 'ratee')
      .where('ratee.id = :uid', { uid: providerUserId })
      .groupBy('r.score')
      .getRawMany();

    const b: Record<string, number> = { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 };
    for (const row of rows) b[String(row.score)] = Number(row.count);

    // Promedio/cantidad mantenido en ProviderProfile (si existe)
    const profile = await this.provRepo.findOne({
      where: { user: { id: providerUserId } as any },
    });

    return {
      ratingAvg: Number(profile?.ratingAvg ?? 0),
      ratingCount: profile?.ratingCount ?? 0,
      breakdown: { '5': b['5'], '4': b['4'], '3': b['3'], '2': b['2'], '1': b['1'] },
    };
  }

  private async recomputeProviderStats(providerUserId: number) {
    const row =
      await this.ratingRepo
        .createQueryBuilder('r')
        .select('AVG(r.score)', 'avg')
        .addSelect('COUNT(*)', 'cnt')
        .innerJoin('r.ratee', 'ratee')
        .where('ratee.id = :uid', { uid: providerUserId })
        .getRawOne<{ avg: string | null; cnt: string }>();

    const { avg, cnt } = row ?? { avg: null, cnt: '0' };

    const profile = await this.provRepo.findOne({
      where: { user: { id: providerUserId } as any },
      relations: { user: true },
    });
    if (!profile) return;

    profile.ratingAvg = Number(avg ?? 0).toFixed(2);
    profile.ratingCount = Number(cnt ?? 0);
    await this.provRepo.save(profile);
  }



}
