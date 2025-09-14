// src/modules/providers/providers.service.ts
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';

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
  ) { }

  /** Asegura que exista el perfil del proveedor para el userId. */
  private async getOrCreateProfile(userId: number) {
    let profile = await this.profileRepo.findOne({
      where: { user: { id: userId } },
      relations: { user: true },
    });

    if (!profile) {
      const user = await this.userRepo.findOne({ where: { id: userId } });
      if (!user) throw new NotFoundException('User not found');

      profile = this.profileRepo.create({
        user,
        // defaults seguros
        verified: false,
        ratingAvg: '0',
        ratingCount: 0,
        displayName: '',
        phone: '',
        photoUrl: null,
        bio: '',
        // si tu entidad tiene estos campos, podés setearlos:
        // lat: 0,
        // lng: 0,
        // radiusKm: 0,
        // active: true,
      } as Partial<ProviderProfile>);

      profile = await this.profileRepo.save(profile);
      // vuelve a leer con relaciones normalizadas
      profile = await this.profileRepo.findOne({
        where: { id: profile.id },
        relations: { user: true },
      });
    }

    return profile!;
  }

  async getMyProfile(userId: number) {
    const p = await this.getOrCreateProfile(userId);
    return {
      ...p,
      user: {
        id: p.user.id,
        email: p.user.email,
        name: p.user.name,
        role: p.user.role,
      },
    };
  }

  /**
   * Idempotente: si existe, actualiza; si no existe, lo crea.
   * Mergea sólo campos definidos para no pisar con undefined.
   */
  async updateMyProfile(userId: number, dto: UpdateProviderProfileDto) {
    const profile = await this.getOrCreateProfile(userId);

    // construir patch SOLO con campos que existen en tu DTO actual
    const patch: Partial<ProviderProfile> = {};
    if (dto.displayName !== undefined) patch.displayName = dto.displayName;
    if (dto.phone !== undefined) patch.phone = dto.phone;
    if (dto.bio !== undefined) patch.bio = dto.bio;
    if (dto.photoUrl !== undefined) patch.photoUrl = dto.photoUrl;

    // si tu entidad tiene estos campos:
    if (dto.lat !== undefined) (patch as any).lat = dto.lat;
    if (dto.lng !== undefined) (patch as any).lng = dto.lng;
    if (dto.radiusKm !== undefined) (patch as any).radiusKm = dto.radiusKm;

    Object.assign(profile, patch);
    await this.profileRepo.save(profile);

    return this.getMyProfile(userId);
  }

  async getMyServiceTypes(userId: number) {
    const p = await this.getOrCreateProfile(userId);

    const rows = await this.pstRepo.find({
      where: { provider: { id: p.id } as any },
      relations: { serviceType: true },
      order: { id: 'ASC' },
    });

    return rows.map((r) => ({
      id: r.id,
      serviceTypeId: r.serviceType.id,
      serviceTypeName: r.serviceType.name,
      basePrice: r.basePrice, // string (DECIMAL en MySQL)
      active: r.active,
    }));
  }

  async setMyServiceTypes(userId: number, items: ServiceTypeItemDto[]) {
    const p = await this.getOrCreateProfile(userId);

    const ids = items.map((i) => i.serviceTypeId);
    const found = await this.stRepo.find({ where: { id: In(ids) } });
    if (found.length !== ids.length)
      throw new NotFoundException('Some serviceTypeId not found');

    const existing = await this.pstRepo.find({
      where: { provider: { id: p.id } as any },
      relations: { serviceType: true, provider: true },
    });

    const byServiceTypeId = new Map(existing.map((e) => [e.serviceType.id, e]));
    const keep = new Set<number>();

    for (const it of items) {
      const prev = byServiceTypeId.get(it.serviceTypeId);
      if (prev) {
        if (typeof it.basePrice === 'number')
          prev.basePrice = String(it.basePrice);
        if (typeof it.active === 'boolean') prev.active = it.active;
        await this.pstRepo.save(prev);
        keep.add(prev.serviceType.id);
      } else {
        const row = this.pstRepo.create({
          provider: { id: p.id } as any,
          serviceType: { id: it.serviceTypeId } as any,
          basePrice:
            typeof it.basePrice === 'number' ? String(it.basePrice) : null,
          active: typeof it.active === 'boolean' ? it.active : true,
        });
        await this.pstRepo.save(row);
        keep.add(it.serviceTypeId);
      }
    }

    const toRemove = existing.filter((e) => !keep.has(e.serviceType.id));
    if (toRemove.length) await this.pstRepo.remove(toRemove);

    return this.getMyServiceTypes(userId);
  }

  /** Perfil público por userId (datos visibles + resumen numérico) */
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

  /** Tipos de servicio ofrecidos por el proveedor (filtra por userId) */
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

  /** Buscar proveedores por tipo + radio desde lat/lng */
  async searchProviders(q: SearchProvidersDto) {
    const serviceTypeId = Number(q.serviceTypeId);
    const lat = Number(q.lat);
    const lng = Number(q.lng);
    const radiusKm = Number(q.radiusKm ?? 10);
    const page = Math.max(1, Number(q.page ?? 1));
    const limit = Math.min(50, Math.max(1, Number(q.limit ?? 20)));
    const sort = (q.sort ?? 'distance') as 'distance' | 'rating' | 'price';

    if (Number.isNaN(serviceTypeId) || Number.isNaN(lat) || Number.isNaN(lng)) {
      throw new BadRequestException(
        'serviceTypeId, lat y lng son requeridos',
      );
    }

    // Haversine (km) sobre la dirección por defecto del proveedor
    const distanceExpr = `
      6371 * acos(
        cos(radians(:lat)) * cos(radians(addr.lat)) * cos(radians(addr.lng) - radians(:lng))
        + sin(radians(:lat)) * sin(radians(addr.lat))
      )
    `;

    const baseQb = this.pstRepo
      .createQueryBuilder('pst')
      .innerJoin('pst.provider', 'prov')
      .innerJoin('prov.user', 'u')
      .innerJoin('pst.serviceType', 'st')
      .innerJoin(
        UserAddress,
        'addr',
        'addr.user_id = u.id AND addr.isDefault = 1 AND addr.lat IS NOT NULL AND addr.lng IS NOT NULL',
      )
      .where('pst.active = 1 AND st.id = :stId', { stId: serviceTypeId })
      .addSelect('u.id', 'providerUserId')
      .addSelect('prov.displayName', 'displayName')
      .addSelect('prov.photoUrl', 'photoUrl')
      .addSelect('prov.ratingAvg', 'ratingAvg')
      .addSelect('prov.ratingCount', 'ratingCount')
      .addSelect('pst.basePrice', 'basePrice')
      .addSelect('st.name', 'serviceTypeName')
      .addSelect('addr.lat', 'lat')
      .addSelect('addr.lng', 'lng')
      .addSelect(distanceExpr, 'distanceKm')
      .setParameters({ lat, lng })
      // Agrupar para ONLY_FULL_GROUP_BY
      .groupBy('pst.id')
      .addGroupBy('prov.id')
      .addGroupBy('u.id')
      .addGroupBy('st.id')
      .addGroupBy('addr.id')
      .addGroupBy('prov.displayName')
      .addGroupBy('prov.photoUrl')
      .addGroupBy('prov.ratingAvg')
      .addGroupBy('prov.ratingCount')
      .addGroupBy('pst.basePrice')
      .addGroupBy('st.name')
      .addGroupBy('addr.lat')
      .addGroupBy('addr.lng');

    // HAVING por radio (alias calculado)
    baseQb.having('distanceKm <= :radius', { radius: radiusKm });

    // Orden
    if (sort === 'rating') {
      baseQb.orderBy('prov.ratingAvg', 'DESC').addOrderBy('distanceKm', 'ASC');
    } else if (sort === 'price') {
      baseQb.orderBy('pst.basePrice', 'ASC').addOrderBy('distanceKm', 'ASC');
    } else {
      baseQb.orderBy('distanceKm', 'ASC').addOrderBy('prov.ratingAvg', 'DESC');
    }

    // Total sin paginar
    const total = (
      await baseQb.clone().offset(undefined).limit(undefined).getRawMany()
    ).length;

    // Página
    const rows = await baseQb.skip((page - 1) * limit).take(limit).getRawMany();

    const items = rows.map((r: any) => ({
      providerUserId: Number(r.providerUserId),
      displayName: r.displayName ?? null,
      photoUrl: r.photoUrl ?? null,
      ratingAvg: r.ratingAvg, // string (DECIMAL)
      ratingCount: Number(r.ratingCount ?? 0),
      basePrice: r.basePrice, // string (DECIMAL) o null
      serviceTypeName: r.serviceTypeName,
      distanceKm: Number(r.distanceKm?.toFixed?.(2) ?? r.distanceKm),
      location: { lat: Number(r.lat), lng: Number(r.lng) },
    }));

    return {
      items,
      meta: { page, limit, total, pages: Math.ceil(total / limit) },
    };
  }
}
