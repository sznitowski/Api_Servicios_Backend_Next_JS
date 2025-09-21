// src/app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoggerModule } from 'nestjs-pino';
import { randomUUID } from 'node:crypto';

import { UsersModule } from './modules/users/users.module';
import { AuthModule } from './modules/auth/auth.module';
import { CatalogModule } from './modules/catalog/catalog.module';
import { RequestsModule } from './modules/request/requests.module';
import { ProvidersModule } from './modules/providers/providers.module';
import { NotificationsModule } from './modules/notifications/notifications.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),

    // ⬇️ Logger bonito en consola y JSON limpio en prod
    LoggerModule.forRoot({
      pinoHttp: {
        genReqId: (req: any) =>
          (req.headers['x-request-id'] as string) ?? randomUUID(),
        transport:
          process.env.NODE_ENV === 'production'
            ? undefined
            : {
                target: 'pino-pretty',
                options: {
                  singleLine: true,
                  colorize: true,
                  translateTime: 'SYS:standard', // 2025-09-08 20:30:15
                },
              },
        serializers: {
          req(req) { return { id: req.id, method: req.method, url: req.url }; },
          res(res) { return { statusCode: res.statusCode }; },
        },
        customLogLevel: (req, res, err) => {
          if (err || res.statusCode >= 500) return 'error';
          if (res.statusCode >= 400) return 'warn';
          return 'info';
        },
      },
    }),

    TypeOrmModule.forRoot({
      type: 'mysql',
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT ?? 3306),
      username: process.env.DB_USER,
      password: process.env.DB_PASS,
      database: process.env.DB_NAME,
      autoLoadEntities: true,
       synchronize: false, 
      //synchronize: process.env.NODE_ENV !== 'production', // solo en dev/test
      logging: process.env.NODE_ENV !== 'production',
    }),

    UsersModule,
    AuthModule,
    CatalogModule,
    RequestsModule,
    ProvidersModule,
    NotificationsModule
  ],
})
export class AppModule {}
