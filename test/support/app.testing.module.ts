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
    // --- seed mínimo: users + (intento) service types/provider profile ---
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

    // intenta setear active/isActive por si cambia el nombre en la entidad
    try {
      await this.ds.query(
        `UPDATE users SET isActive=1 WHERE email IN (?, ?, ?, ?)`,
        emails.map(e => e.email),
      );
    } catch {}
    try {
      await this.ds.query(
        `UPDATE users SET active=1 WHERE email IN (?, ?, ?, ?)`,
        emails.map(e => e.email),
      );
    } catch {}
  }
}
