import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryFailedError } from 'typeorm';
import * as bcrypt from 'bcrypt';

import { User, UserRole } from './user.entity';
import { UserAddress } from './user-address.entity';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(UserAddress)
    private readonly addrRepo: Repository<UserAddress>,
  ) {}

  // ---------- USERS (existentes) ----------
  async create(payload: {
    email: string;
    name: string;
    password: string;
    role?: UserRole;
  }) {
    const exists = await this.userRepo.findOne({
      where: { email: payload.email },
    });
    if (exists) throw new ConflictException('Email already in use');

    const hash = await bcrypt.hash(payload.password, 10);
    const user = this.userRepo.create({
      email: payload.email,
      name: payload.name,
      password: hash,
      role: payload.role ?? UserRole.CLIENT,
    });

    try {
      const created = await this.userRepo.save(user);
      const { password, ...safe } = created as any;
      return safe;
    } catch (e) {
      const code = (e as any)?.driverError?.code;
      if (e instanceof QueryFailedError && code === 'ER_DUP_ENTRY') {
        throw new ConflictException('Email already in use');
      }
      throw e;
    }
  }

  findByEmail(email: string) {
    return this.userRepo.findOne({ where: { email } });
  }

  findByEmailWithPassword(email: string) {
    return this.userRepo
      .createQueryBuilder('u')
      .addSelect('u.password')
      .where('LOWER(u.email) = LOWER(:email)', { email })
      .getOne();
  }

  findById(id: number) {
    return this.userRepo.findOne({
      where: { id },
      select: ['id', 'email', 'name', 'role', 'active', 'createdAt', 'updatedAt'],
    });
  }

  async setRefreshToken(userId: number, hash: string | null) {
    await this.userRepo.update(userId, { refreshTokenHash: hash });
  }

  getUserWithRefresh(userId: number) {
    return this.userRepo
      .createQueryBuilder('u')
      .addSelect('u.refreshTokenHash')
      .where('u.id = :id', { id: userId })
      .getOne();
  }

  findAll() {
    return this.userRepo.find({
      select: ['id', 'email', 'name', 'role', 'active', 'createdAt', 'updatedAt'],
    });
  }

  // ---------- PERFIL SANITIZADO ----------
  async getMe(userId: number) {
    const u = await this.userRepo.findOne({ where: { id: userId } });
    if (!u) throw new NotFoundException('User not found');
    return {
      id: u.id,
      email: u.email,
      name: u.name,
      role: u.role,
      createdAt: u.createdAt,
      updatedAt: u.updatedAt,
    };
  }

  // ---------- ADDRESSES ----------
  async listMyAddresses(userId: number) {
    return this.addrRepo.find({
      where: { user: { id: userId } as any },
      order: { isDefault: 'DESC', createdAt: 'DESC' },
    });
  }

  async createMyAddress(userId: number, dto: CreateAddressDto) {
    // si marca default, apagar los demás
    if (dto.isDefault) {
      await this.addrRepo.update(
        { user: { id: userId } as any },
        { isDefault: false },
      );
    }

    // si no hay direcciones aún, forzar default
    const count = await this.addrRepo.count({
      where: { user: { id: userId } as any },
    });
    const isDefault = dto.isDefault || count === 0;

    const row = this.addrRepo.create({
      user: { id: userId } as any,
      label: dto.label ?? null,
      address: dto.address,
      lat: dto.lat != null ? String(dto.lat) : null,
      lng: dto.lng != null ? String(dto.lng) : null,
      isDefault,
    });

    return this.addrRepo.save(row);
  }

  async updateMyAddress(
    userId: number,
    addrId: number,
    dto: UpdateAddressDto,
  ) {
    const row = await this.addrRepo.findOne({
      where: { id: addrId, user: { id: userId } as any },
    });
    if (!row) throw new NotFoundException('Address not found');

    if (dto.label !== undefined) row.label = dto.label;
    if (dto.address !== undefined) row.address = dto.address;
    if (dto.lat !== undefined) row.lat = dto.lat != null ? String(dto.lat) : null;
    if (dto.lng !== undefined) row.lng = dto.lng != null ? String(dto.lng) : null;

    if (dto.isDefault === true) {
      await this.addrRepo.update(
        { user: { id: userId } as any },
        { isDefault: false },
      );
      row.isDefault = true;
    } else if (dto.isDefault === false) {
      row.isDefault = false;
    }

    return this.addrRepo.save(row);
  }

  async deleteMyAddress(userId: number, addrId: number) {
    const row = await this.addrRepo.findOne({
      where: { id: addrId, user: { id: userId } as any },
    });
    if (!row) throw new NotFoundException('Address not found');

    const wasDefault = row.isDefault;
    await this.addrRepo.remove(row);

    if (wasDefault) {
      const candidate = await this.addrRepo.findOne({
        where: { user: { id: userId } as any },
        order: { createdAt: 'DESC' },
      });
      if (candidate) {
        candidate.isDefault = true;
        await this.addrRepo.save(candidate);
      }
    }

    return { ok: true };
  }
}
