// src/app.testing.module.ts
import { Module, OnModuleInit } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';

import { User, UserRole } from './modules/users/user.entity';

// IMPORTA módulos de features, NO AppModule
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { CatalogModule } from './modules/catalog/catalog.module';
import { RequestsModule } from './modules/request/requests.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot({
      type: 'sqlite',
      database: ':memory:',
      dropSchema: true,
      synchronize: true,
      autoLoadEntities: true,
      logging: false,
    }),
    // features que exponen endpoints usados por los e2e
    AuthModule,
    UsersModule,
    CatalogModule,
    RequestsModule,
  ],
})
export class AppTestingModule implements OnModuleInit {
  constructor(@InjectDataSource() private readonly ds: DataSource) {}

  async onModuleInit() {
    // ---- Seed: users ----
    const userRepo = this.ds.getRepository(User);
    const ensureUser = async (email: string, role: UserRole) => {
      let u = await userRepo.findOne({ where: { email } });
      if (!u) {
        u = userRepo.create({
          email,
          name: email.split('@')[0],
          password: await bcrypt.hash('123456', 10),
          role,
          active: true,
        });
        await userRepo.save(u);
      }
      return u;
    };

    const cli = await ensureUser('test@demo.com', UserRole.CLIENT);
    const prov = await ensureUser('prov@demo.com', UserRole.PROVIDER);

    // ---- Seed: service type (y categoría) ----
    let stRow = await this.ds.query(`SELECT id FROM service_types LIMIT 1`);
    let serviceTypeId: number | undefined = stRow?.[0]?.id;

    if (!serviceTypeId) {
      // categoría
      const cat = await this.ds.query(
        `INSERT INTO categories (name, active, createdAt, updatedAt)
         VALUES (?, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        ['General'],
      );
      const categoryId = cat.lastID ?? cat.insertId;

      const st = await this.ds.query(
        `INSERT INTO service_types (name, category_id, active, createdAt, updatedAt)
         VALUES (?, ?, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        ['Mudanza', categoryId],
      );
      serviceTypeId = st.lastID ?? st.insertId;
    }

    // ---- Seed: provider_profile (si existe la tabla) ----
    let providerProfileId: number | undefined;
    try {
      await this.ds.query(
        `INSERT INTO provider_profiles (user_id, createdAt, updatedAt)
         VALUES (?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        [prov.id],
      );
    } catch (_) {
      // la tabla puede no existir en tu esquema -> no es error
    }

    try {
      const pr: any[] = await this.ds.query(
        `SELECT id FROM provider_profiles WHERE user_id = ? LIMIT 1`,
        [prov.id],
      );
      providerProfileId = pr?.[0]?.id;
    } catch (_) {
      /* si no existe la tabla, seguimos */
    }

    // ---- Seed: vínculo proveedor ↔ service type en la tabla puente real (SQLite) ----
    // Detectar columnas existentes
    const cols: Array<{ name: string }> = await this.ds.query(
      `PRAGMA table_info('provider_service_types')`,
    ).catch(() => []);

    if (cols?.length) {
      const names = cols.map(c => c.name);
      const has = (n: string) => names.includes(n);

      // mapeo flexible de columnas
      const payload: Record<string, any> = {};

      // columna a usar para provider/profile
      if (providerProfileId != null) {
        if (has('provider_profile_id')) payload['provider_profile_id'] = providerProfileId;
        else if (has('providerProfileId')) payload['providerProfileId'] = providerProfileId;
      } else {
        if (has('provider_id')) payload['provider_id'] = prov.id;
        else if (has('providerId')) payload['providerId'] = prov.id;
      }

      // columna a usar para service type
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
          if ((v as any)?.raw) {
            qmarks.push((v as any).raw);
          } else {
            qmarks.push('?');
            params.push(v);
          }
        }

        const sql = `INSERT OR IGNORE INTO provider_service_types (${colsList.join(', ')})
                     VALUES (${qmarks.join(', ')})`;
        await this.ds.query(sql, params);
      }
    }

    // listo: users + service type + vínculo creados para e2e
  }
}
