// test/app-testing.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AuthModule } from '../src/modules/auth/auth.module';
import { UsersModule } from '../src/modules/users/users.module';
import { CatalogModule } from '../src/modules/catalog/catalog.module';
import { RequestsModule } from '../src/modules/request/requests.module';
import { ProvidersModule } from '../src/modules/providers/providers.module';
import { NotificationsModule } from '../src/modules/notifications/notifications.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.test', '.env'], // primero toma .env.test
    }),
    TypeOrmModule.forRoot({
      type: 'mysql',                                   // para e2e sobre MySQL
      host: process.env.DB_HOST ?? '127.0.0.1',
      port: Number(process.env.DB_PORT ?? 3306),
      username: process.env.DB_USER ?? 'root',
      password: process.env.DB_PASS ?? '',
      database: process.env.DB_NAME ?? 'services_test',
      autoLoadEntities: true,                          // carga entidades de los módulos
      synchronize: true,                               // en testing: crea esquema
      dropSchema: true,                                // resetea en cada suite
      logging: false,
    }),
    UsersModule,
    AuthModule,
    CatalogModule,
    RequestsModule,
    ProvidersModule,
    NotificationsModule,                            
  ],
})
export class AppTestingModule {}
