// src/modules/providers/providers.service.ts
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository, DeepPartial } from 'typeorm';

import { ProviderProfile } from './provider-profile.entity';
import { ProviderServiceType } from './provider-service-type.entity';
import { ServiceType } from '../catalog/service-types/service-type.entity';
import { User } from '../users/user.entity';
import { UserAddress } from '../users/user-address.entity';

import { UpdateProviderProfileDto } from './dto/update-provider-profile.dto';
import { ServiceTypeItemDto } from './dto/set-service-types.dto';
import { SearchProvidersDto } from './dto/search-providers.dto';

@Injectable()
export class ProvidersService {
  constructor(
    @InjectRepository(ProviderProfile)
    private readonly profileRepo: Repository<ProviderProfile>,
    @InjectRepository(ProviderServiceType)
    private readonly pstRepo: Repository<ProviderServiceType>,
    @InjectRepository(ServiceType)
    private readonly stRepo: Repository<ServiceType>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  /** Crea (si no existe) y devuelve el perfil del proveedor para un userId. */
  private async getOrCreateProfile(userId: number) {
    let profile = await this.profileRepo.findOne({
      where: { user: { id: userId } as any },
      relations: { user: true },
    });

    if (!profile) {
      const user = await this.userRepo.findOne({ where: { id: userId } });
      if (!user) throw new NotFoundException('User not found');

      profile = this.profileRepo.create({
        user,
        verified: false,
        ratingAvg: '0',
        ratingCount: 0,
        displayName: '',
        phone: '',
        photoUrl: null,
        bio: '',
      } as Partial<ProviderProfile>);

      profile = await this.profileRepo.save(profile);
      profile = await this.profileRepo.findOne({
        where: { id: profile.id },
        relations: { user: true },
      });
    }

    return profile!;
  }

  // -------- Perfil propio --------
  async getMyProfile(userId: number) {
    const p = await this.getOrCreateProfile(userId);
    return p;
  }

  async updateMyProfile(userId: number, dto: UpdateProviderProfileDto) {
    const profile = await this.getOrCreateProfile(userId);

    const patch: Partial<ProviderProfile> = {};
    if (dto.displayName !== undefined) patch.displayName = dto.displayName;
    if (dto.phone !== undefined) patch.phone = dto.phone;
    if (dto.bio !== undefined) patch.bio = dto.bio;
    if (dto.photoUrl !== undefined) patch.photoUrl = dto.photoUrl;

    // si tu entidad tiene geolocalización:
    if ((dto as any).lat !== undefined) (patch as any).lat = (dto as any).lat;
    if ((dto as any).lng !== undefined) (patch as any).lng = (dto as any).lng;
    if ((dto as any).radiusKm !== undefined) (patch as any).radiusKm = (dto as any).radiusKm;

    Object.assign(profile, patch);
    await this.profileRepo.save(profile);

    return this.getMyProfile(userId);
  }

  // -------- Mis tipos de servicio --------
  async getMyServiceTypes(userId: number, opts?: { active?: boolean }) {
    const p = await this.getOrCreateProfile(userId);

    const where: any = { provider: { id: p.id } as any };
    if (typeof opts?.active === 'boolean') where.active = opts.active;

    const rows = await this.pstRepo.find({
      where,
      relations: { serviceType: true },
      order: { id: 'ASC' },
    });

    return rows.map((r) => ({
      id: r.id,
      serviceTypeId: r.serviceType.id,
      serviceTypeName: r.serviceType.name,
      basePrice: r.basePrice,
      active: r.active,
    }));
  }

  async setMyServiceTypes(userId: number, items: ServiceTypeItemDto[]) {
    const p = await this.getOrCreateProfile(userId);

    const ids = items.map((i) => i.serviceTypeId);
    if (ids.length) {
      const found = await this.stRepo.find({ where: { id: In(ids) } });
      if (found.length !== ids.length) {
        throw new NotFoundException('Some serviceTypeId not found');
      }
    }

    const existing = await this.pstRepo.find({
      where: { provider: { id: p.id } as any },
      relations: { serviceType: true, provider: true },
    });

    const byServiceTypeId = new Map(existing.map((e) => [e.serviceType.id, e]));
    const keep = new Set<number>();

    for (const it of items) {
      const prev = byServiceTypeId.get(it.serviceTypeId);
      if (prev) {
        if (typeof it.basePrice === 'number') prev.basePrice = String(it.basePrice);
        if (typeof it.active === 'boolean') prev.active = it.active;
        await this.pstRepo.save(prev);
        keep.add(prev.serviceType.id);
      } else {
        const st = await this.stRepo.findOne({ where: { id: it.serviceTypeId } });
        if (!st) throw new NotFoundException('ServiceType not found');

        const created = this.pstRepo.create({
          provider: p,
          serviceType: st,
          basePrice: typeof it.basePrice === 'number' ? String(it.basePrice) : null,
          active: typeof it.active === 'boolean' ? it.active : true,
        } as DeepPartial<ProviderServiceType>);

        await this.pstRepo.save(created);
        keep.add(it.serviceTypeId);
      }
    }

    const toRemove = existing.filter((e) => !keep.has(e.serviceType.id));
    if (toRemove.length) await this.pstRepo.remove(toRemove);

    return this.getMyServiceTypes(userId);
  }

  async upsertMyServiceType(userId: number, it: ServiceTypeItemDto) {
    const p = await this.getOrCreateProfile(userId);

    const st = await this.stRepo.findOne({ where: { id: it.serviceTypeId } });
    if (!st) throw new NotFoundException('ServiceType not found');

    const existing = await this.pstRepo.findOne({
      where: { provider: { id: p.id } as any, serviceType: { id: st.id } as any },
      relations: { serviceType: true },
    });

    let row: ProviderServiceType;
    if (existing) {
      row = existing;
      if (typeof it.basePrice === 'number') row.basePrice = String(it.basePrice);
      if (typeof it.active === 'boolean') row.active = it.active;
    } else {
      row = this.pstRepo.create({
        provider: p,
        serviceType: st,
        basePrice: typeof it.basePrice === 'number' ? String(it.basePrice) : null,
        active: typeof it.active === 'boolean' ? it.active : true,
      } as DeepPartial<ProviderServiceType>);
    }

    row = await this.pstRepo.save(row);

    return {
      id: row.id,
      serviceTypeId: st.id,
      serviceTypeName: st.name,
      basePrice: row.basePrice,
      active: row.active,
    };
  }

  async deactivateMyServiceType(userId: number, serviceTypeId: number) {
    const p = await this.getOrCreateProfile(userId);

    const row = await this.pstRepo.findOne({
      where: { provider: { id: p.id } as any, serviceType: { id: serviceTypeId } as any },
      relations: { serviceType: true },
    });
    if (!row) throw new NotFoundException('Service type not linked');

    row.active = false;
    const saved = await this.pstRepo.save(row);

    return {
      id: saved.id,
      serviceTypeId: saved.serviceType.id,
      serviceTypeName: saved.serviceType.name,
      basePrice: saved.basePrice,
      active: saved.active,
    };
  }

  // -------- Público --------
  async getPublicProfileByUserId(userId: number) {
    const profile = await this.profileRepo.findOne({
      where: { user: { id: userId } as any },
      relations: { user: true },
    });
    if (!profile) throw new NotFoundException('Provider profile not found');

    return {
      user: { id: profile.user.id, name: profile.user.name },
      displayName: profile.displayName ?? profile.user.name,
      photoUrl: profile.photoUrl,
      bio: profile.bio,
      ratingAvg: profile.ratingAvg,
      ratingCount: profile.ratingCount,
      verified: profile.verified,
      updatedAt: profile.updatedAt,
    };
  }

  async getServiceTypesForUser(userId: number) {
    const profile = await this.profileRepo.findOne({
      where: { user: { id: userId } as any },
      relations: { user: true },
    });
    if (!profile) throw new NotFoundException('Provider profile not found');

    const rows = await this.pstRepo.find({
      where: { provider: { id: profile.id } as any, active: true },
      relations: { serviceType: true },
      order: { id: 'ASC' },
    });

    return rows.map((r) => ({
      id: r.id,
      serviceTypeId: r.serviceType.id,
      serviceTypeName: r.serviceType.name,
      basePrice: r.basePrice,
      active: r.active,
    }));
  }

  // -------- Búsqueda --------
  async searchProviders(q: SearchProvidersDto) {
    const lat = Number(q.lat);
    const lng = Number(q.lng);
    const radiusKm = Number(q.radiusKm ?? 10);
    const page = Math.max(1, Number(q.page ?? 1));
    const limit = Math.min(50, Math.max(1, Number(q.limit ?? 20)));
    const sort = (q.sort ?? 'distance') as 'distance' | 'rating' | 'price';

    const serviceTypeId = q.serviceTypeId != null ? Number(q.serviceTypeId) : null;
    const categoryId = q.categoryId != null ? Number(q.categoryId) : null;

    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      throw new BadRequestException('lat y lng son requeridos');
    }
    if (!serviceTypeId && !categoryId) {
      throw new BadRequestException('Debe indicar serviceTypeId o categoryId');
    }

    const distanceExpr = `
      6371 * acos(
        cos(radians(:lat)) * cos(radians(addr.lat)) * cos(radians(addr.lng) - radians(:lng))
        + sin(radians(:lat)) * sin(radians(addr.lat))
      )
    `;

    // Base: pst (provider_service_types) + st (service_types) + addr (address del user)
    const baseQb = this.pstRepo
      .createQueryBuilder('pst')
      .innerJoin('pst.provider', 'prov')
      .innerJoin('prov.user', 'u')
      .innerJoin('pst.serviceType', 'st')
      .innerJoin(
        UserAddress,
        'addr',
        'addr.user_id = u.id AND addr.is_default = 1 AND addr.lat IS NOT NULL AND addr.lng IS NOT NULL',
      )
      .where('pst.active = 1')
      .addSelect('u.id', 'providerUserId')
      .addSelect('prov.displayName', 'displayName')
      .addSelect('prov.photoUrl', 'photoUrl')
      .addSelect('prov.ratingAvg', 'ratingAvg')
      .addSelect('prov.ratingCount', 'ratingCount')
      // ⬇︎ Precio mínimo (numérico) entre los service types que matchean
      .addSelect('MIN(CAST(pst.basePrice AS DECIMAL(10,2)))', 'basePrice')
      // ⬇︎ Un nombre de servicio de referencia (si hay varios, el mínimo lexicográfico)
      .addSelect('MIN(st.name)', 'serviceTypeName')
      .addSelect('addr.lat', 'lat')
      .addSelect('addr.lng', 'lng')
      .addSelect(distanceExpr, 'distanceKm')
      .setParameters({ lat, lng })
      // Group por proveedor (y columnas no agregadas)
      .groupBy('prov.id')
      .addGroupBy('u.id')
      .addGroupBy('addr.id')
      .addGroupBy('prov.displayName')
      .addGroupBy('prov.photoUrl')
      .addGroupBy('prov.ratingAvg')
      .addGroupBy('prov.ratingCount')
      .addGroupBy('addr.lat')
      .addGroupBy('addr.lng');

    // Filtro por service type o por categoría
    if (serviceTypeId) {
      baseQb.andWhere('st.id = :stId', { stId: serviceTypeId });
    } else if (categoryId) {
      baseQb.andWhere('st.category_id = :catId', { catId: categoryId });
    }

    // Radio
    baseQb.having('distanceKm <= :radius', { radius: radiusKm });

    // ---------- Filtros opcionales ----------
    if (typeof q.minRating === 'number') {
      baseQb.andWhere('CAST(prov.ratingAvg AS DECIMAL(3,2)) >= :minRating', {
        minRating: q.minRating,
      });
    }

    if (typeof q.minReviews === 'number') {
      baseQb.andWhere('prov.ratingCount >= :minReviews', { minReviews: q.minReviews });
    }

    // Para filtros de precio, usamos las filas de pst (no el agregado) para que
    // “exista” al menos una oferta del proveedor en ese rango.
    if (typeof q.minPrice === 'number') {
      baseQb.andWhere('pst.basePrice IS NOT NULL')
        .andWhere('CAST(pst.basePrice AS DECIMAL(10,2)) >= :minPrice', { minPrice: q.minPrice });
    }

    if (typeof q.maxPrice === 'number') {
      baseQb.andWhere('pst.basePrice IS NOT NULL')
        .andWhere('CAST(pst.basePrice AS DECIMAL(10,2)) <= :maxPrice', { maxPrice: q.maxPrice });
    }

    if (typeof q.hasPhoto === 'boolean') {
      if (q.hasPhoto) {
        baseQb.andWhere("(prov.photoUrl IS NOT NULL AND prov.photoUrl <> '')");
      } else {
        baseQb.andWhere("(prov.photoUrl IS NULL OR prov.photoUrl = '')");
      }
    }

    const term = (q.q ?? '').trim();
    if (term) {
      baseQb.andWhere('(prov.displayName LIKE :q OR u.name LIKE :q)', { q: `%${term}%` });
    }

    // ---------- Orden ----------
    if (sort === 'rating') {
      baseQb.orderBy('prov.ratingAvg', 'DESC').addOrderBy('distanceKm', 'ASC');
    } else if (sort === 'price') {
      // Orden por precio agregado (NULL al final)
      baseQb
        .orderBy('CASE WHEN basePrice IS NULL THEN 1 ELSE 0 END', 'ASC')
        .addOrderBy('basePrice', 'ASC')
        .addOrderBy('distanceKm', 'ASC');
    } else {
      baseQb.orderBy('distanceKm', 'ASC').addOrderBy('prov.ratingAvg', 'DESC');
    }

    // ---------- Total y página ----------
    const total = (
      await baseQb.clone().offset(undefined).limit(undefined).getRawMany()
    ).length;

    const rows = await baseQb.skip((page - 1) * limit).take(limit).getRawMany();

    const items = rows.map((r: any) => ({
      providerUserId: Number(r.providerUserId),
      displayName: r.displayName ?? null,
      photoUrl: r.photoUrl ?? null,
      ratingAvg: r.ratingAvg,
      ratingCount: Number(r.ratingCount ?? 0),
      basePrice: r.basePrice as string | null,            // precio “desde”
      serviceTypeName: r.serviceTypeName ?? null,         // referencia
      distanceKm: Number(r.distanceKm?.toString() ?? 0),
      location: { lat: Number(r.lat), lng: Number(r.lng) },
    }));

    return {
      items,
      meta: { page, limit, total, pages: Math.ceil(total / limit) },
    };
  }
}
