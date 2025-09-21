// src/app.testing.module.ts
import { Module, OnModuleInit } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule, InjectDataSource } from '@nestjs/typeorm';
import { DataSource, DeepPartial } from 'typeorm';
import * as bcrypt from 'bcrypt';

import { User, UserRole } from './modules/users/user.entity';

// IMPORTAR módulos de features usados por los e2e (NO AppModule)
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { CatalogModule } from './modules/catalog/catalog.module';
import { RequestsModule } from './modules/request/requests.module';
import { ProvidersModule } from './modules/providers/providers.module';
import { NotificationsModule } from './modules/notifications/notifications.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.test', '.env'],
    }),
    TypeOrmModule.forRoot({
      type: 'sqlite',
      database: ':memory:',
      dropSchema: true,      // limpia en cada corrida de e2e
      synchronize: true,     // crea el esquema automáticamente
      autoLoadEntities: true,
      logging: false,
    }),
    AuthModule,
    UsersModule,
    CatalogModule,
    RequestsModule,
    ProvidersModule,
    NotificationsModule,
  ],
})
export class AppTestingModule implements OnModuleInit {
  constructor(@InjectDataSource() private readonly ds: DataSource) {}

  async onModuleInit() {
    // ---------- Seed: usuarios que usan los tests ----------
    const userRepo = this.ds.getRepository(User);
    const passHash = await bcrypt.hash('123456', 10);

    const emails: Array<{ email: string; role: UserRole }> = [
      { email: 'prov@demo.com',      role: UserRole.PROVIDER },
      { email: 'provider1@demo.com', role: UserRole.PROVIDER },
      { email: 'client2@demo.com',   role: UserRole.CLIENT   },
      { email: 'test@demo.com',      role: UserRole.CLIENT   },
    ];

    for (const { email, role } of emails) {
      let u = await userRepo.findOne({ where: { email } });
      if (!u) {
        const obj: DeepPartial<User> = {
          email,
          name: email.split('@')[0],
          password: passHash,
          role,
          active: true, // campo real en la entidad
        };
        u = userRepo.create(obj);
        await userRepo.save(u);
      } else {
        (u as any).active = true;
        if (!u.password) u.password = passHash;
        await userRepo.save(u);
      }
    }

    // Refuerzo por SQL directo por si la columna en DB se llama isActive
    try {
      await this.ds.query(
        `UPDATE users SET isActive=1 WHERE email IN (?, ?, ?, ?)`,
        emails.map(e => e.email),
      );
    } catch { /* si no existe la columna, seguimos */ }
    try {
      await this.ds.query(
        `UPDATE users SET active=1 WHERE email IN (?, ?, ?, ?)`,
        emails.map(e => e.email),
      );
    } catch { /* idem */ }

    // ---------- Seed: categoría + service type (mínimo) ----------
    let serviceTypeId: number | undefined;
    try {
      const stRow: any[] = await this.ds.query(`SELECT id FROM service_types LIMIT 1`);
      serviceTypeId = stRow?.[0]?.id;
    } catch { /* si no existe la tabla, lo creará synchronize */ }

    if (!serviceTypeId) {
      try {
        const cat = await this.ds.query(
          `INSERT INTO categories (name, active, createdAt, updatedAt)
           VALUES (?, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
          ['General'],
        );
        const categoryId = (cat as any).lastID ?? (cat as any).insertId;

        const st = await this.ds.query(
          `INSERT INTO service_types (name, category_id, active, createdAt, updatedAt)
           VALUES (?, ?, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
          ['Mudanza', categoryId],
        );
        serviceTypeId = (st as any).lastID ?? (st as any).insertId;
      } catch { /* si el módulo usa otras tablas, no bloquea */ }
    }

    // ---------- Seed: provider_profile (si existe) ----------
    let providerId: number | undefined;
    try {
      const prov = await userRepo.findOne({ where: { email: 'prov@demo.com' } });
      providerId = prov?.id;
    } catch {}

    let providerProfileId: number | undefined;
    if (providerId != null) {
      try {
        await this.ds.query(
          `INSERT INTO provider_profiles (user_id, createdAt, updatedAt)
           VALUES (?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
          [providerId],
        );
      } catch {}
      try {
        const pr: any[] = await this.ds.query(
          `SELECT id FROM provider_profiles WHERE user_id = ? LIMIT 1`,
          [providerId],
        );
        providerProfileId = pr?.[0]?.id;
      } catch {}
    }

    // ---------- Seed: vínculo provider ↔ service_type (si existe tabla puente) ----------
    try {
      const cols: Array<{ name: string }> =
        await this.ds.query(`PRAGMA table_info('provider_service_types')`).catch(() => []);

      if (cols?.length && serviceTypeId != null) {
        const names = cols.map(c => c.name);
        const has = (n: string) => names.includes(n);

        const payload: Record<string, any> = {};

        // provider/profile
        if (providerProfileId != null) {
          if (has('provider_profile_id')) payload['provider_profile_id'] = providerProfileId;
          else if (has('providerProfileId')) payload['providerProfileId'] = providerProfileId;
        } else if (providerId != null) {
          if (has('provider_id')) payload['provider_id'] = providerId;
          else if (has('providerId')) payload['providerId'] = providerId;
        }

        // service type
        if (has('service_type_id')) payload['service_type_id'] = serviceTypeId;
        else if (has('serviceTypeId')) payload['serviceTypeId'] = serviceTypeId;

        // timestamps si existen
        if (has('createdAt')) payload['createdAt'] = { raw: 'CURRENT_TIMESTAMP' };
        if (has('updatedAt')) payload['updatedAt'] = { raw: 'CURRENT_TIMESTAMP' };

        if (Object.keys(payload).length >= 2) {
          const colsList: string[] = [];
          const qmarks: string[] = [];
          const params: any[] = [];

          for (const [k, v] of Object.entries(payload)) {
            colsList.push(k);
            if ((v as any)?.raw) qmarks.push((v as any).raw);
            else { qmarks.push('?'); params.push(v); }
          }

          const sql = `INSERT OR IGNORE INTO provider_service_types (${colsList.join(', ')})
                       VALUES (${qmarks.join(', ')})`;
          await this.ds.query(sql, params);
        }
      }
    } catch { /* si no existe la tabla, no bloquea */ }
  }
}
