import { Injectable, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryFailedError } from 'typeorm';
import { User, UserRole } from './user.entity';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(@InjectRepository(User) private readonly repo: Repository<User>) { }

  async create(payload: { email: string; name: string; password: string; role?: UserRole }) {
    // Pre-chequeo (rápido)
    const exists = await this.repo.findOne({ where: { email: payload.email } });
    if (exists) throw new ConflictException('Email already in use');

    const hash = await bcrypt.hash(payload.password, 10);
    const user = this.repo.create({
      email: payload.email,
      name: payload.name,
      password: hash,
      role: payload.role ?? UserRole.CLIENT,
    });

    try {
      const created = await this.repo.save(user);
      // No devolver el hash
      const { password, ...safe } = created as any;
      return safe;
    } catch (e) {
      const code = (e as any)?.driverError?.code; // MySQL: ER_DUP_ENTRY
      if (e instanceof QueryFailedError && code === 'ER_DUP_ENTRY') {
        throw new ConflictException('Email already in use');
      }
      throw e;
    }
  }

  findByEmail(email: string) {
    return this.repo.findOne({ where: { email } });
  }

  findByEmailWithPassword(email: string) {
    // solo para AuthService (incluye password)
    return this.repo.createQueryBuilder('u')
      .addSelect('u.password')
      .where('u.email = :email', { email })
      .getOne();
  }

  findAll() {
    return this.repo.find({ select: ['id', 'email', 'name', 'role', 'active', 'createdAt', 'updatedAt'] });
  }
}
