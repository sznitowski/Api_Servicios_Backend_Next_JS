// test/support/app.testing.module.ts
import { Module, OnModuleInit } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule, InjectDataSource } from '@nestjs/typeorm';
import { DataSource, DeepPartial } from 'typeorm';
import * as bcrypt from 'bcrypt';

import { User, UserRole } from '../../src/modules/users/user.entity';

import { AuthModule } from '../../src/modules/auth/auth.module';
import { UsersModule } from '../../src/modules/users/users.module';
import { CatalogModule } from '../../src/modules/catalog/catalog.module';
import { RequestsModule } from '../../src/modules/request/requests.module';
import { ProvidersModule } from '../../src/modules/providers/providers.module';
import { NotificationsModule } from '../../src/modules/notifications/notifications.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.test', '.env'],
    }),
    TypeOrmModule.forRoot({
      type: 'sqlite',
      database: ':memory:',
      dropSchema: true,
      synchronize: true,
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
    // --- Users base ---
    const userRepo = this.ds.getRepository(User);
    const passHash = await bcrypt.hash('123456', 10);

    const emails: Array<{ email: string; role: UserRole }> = [
      { email: 'prov@demo.com', role: UserRole.PROVIDER },
      { email: 'provider1@demo.com', role: UserRole.PROVIDER },
      { email: 'client2@demo.com', role: UserRole.CLIENT },
      { email: 'test@demo.com', role: UserRole.CLIENT },
    ];

    for (const { email, role } of emails) {
      let u = await userRepo.findOne({ where: { email } });
      if (!u) {
        const obj: DeepPartial<User> = {
          email,
          name: email.split('@')[0],
          password: passHash,
          role,
          active: true,
        };
        u = userRepo.create(obj);
        await userRepo.save(u);
      } else {
        (u as any).active = true;
        if (!u.password) u.password = passHash;
        await userRepo.save(u);
      }
    }

    // normaliza flags de "activo"
    try {
      await this.ds.query(
        `UPDATE users SET isActive=1 WHERE email IN (?, ?, ?, ?)`,
        emails.map((e) => e.email),
      );
    } catch {}
    try {
      await this.ds.query(
        `UPDATE users SET active=1 WHERE email IN (?, ?, ?, ?)`,
        emails.map((e) => e.email),
      );
    } catch {}

    // --- Catálogo mínimo: crear un Service Type "General" si no hay ninguno ---
    let serviceTypeId: number | null = null;

    // 1) ¿ya existe alguno?
    try {
      const rows = await this.ds.query(`SELECT id FROM service_types ORDER BY id ASC LIMIT 1`);
      if (rows?.length) serviceTypeId = rows[0].id;
    } catch {
      try {
        const rows = await this.ds.query(`SELECT id FROM service_type ORDER BY id ASC LIMIT 1`);
        if (rows?.length) serviceTypeId = rows[0].id;
      } catch {}
    }

    // 2) crear uno si no existe (probando distintos esquemas/columnas)
    if (!serviceTypeId) {
      const tries = [
        `INSERT INTO service_types (name, active) VALUES ('General', 1)`,
        `INSERT INTO service_types (name) VALUES ('General')`,
        `INSERT INTO service_type (name, active) VALUES ('General', 1)`,
        `INSERT INTO service_type (name) VALUES ('General')`,
        `INSERT INTO service_types (name, active, created_at, updated_at) VALUES ('General', 1, datetime('now'), datetime('now'))`,
        `INSERT INTO service_types (name, active, createdAt, updatedAt) VALUES ('General', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      ];
      for (const sql of tries) {
        try {
          await this.ds.query(sql);
          break;
        } catch {}
      }

      // re-leer el id
      try {
        const rows = await this.ds.query(`SELECT id FROM service_types ORDER BY id ASC LIMIT 1`);
        if (rows?.length) serviceTypeId = rows[0].id;
      } catch {
        try {
          const rows = await this.ds.query(`SELECT id FROM service_type ORDER BY id ASC LIMIT 1`);
          if (rows?.length) serviceTypeId = rows[0].id;
        } catch {}
      }
    }

    // 3) vincular provider "prov@demo.com" a ese service type (probando varios join tables comunes)
    if (serviceTypeId) {
      const prov = await userRepo.findOne({ where: { email: 'prov@demo.com' } });
      if (prov?.id) {
        const linkTries = [
          `INSERT OR IGNORE INTO providers_service_types (provider_id, service_type_id) VALUES (?, ?)`,
          `INSERT OR IGNORE INTO provider_service_types (provider_id, service_type_id) VALUES (?, ?)`,
          `INSERT OR IGNORE INTO provider_service_type (provider_id, service_type_id) VALUES (?, ?)`,
          `INSERT OR IGNORE INTO provider_service_types_service_type ("providerId","serviceTypeId") VALUES (?, ?)`,
        ];
        for (const sql of linkTries) {
          try {
            await this.ds.query(sql, [prov.id, serviceTypeId]);
            break;
          } catch {}
        }
      }
    }
  }
}
