// src/app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoggerModule } from 'nestjs-pino';
import { randomUUID } from 'node:crypto';
import { AiModule } from './modules/ai/ai.module';

import { UsersModule } from './modules/users/users.module';
import { AuthModule } from './modules/auth/auth.module';
import { CatalogModule } from './modules/catalog/catalog.module';
import { RequestsModule } from './modules/request/requests.module';
import { ProvidersModule } from './modules/providers/providers.module';
import { NotificationsModule } from './modules/notifications/notifications.module';

// 👇 importación: config centralizada (synchronize:false en prod)
import { typeOrmConfig } from './config/typeorm.config';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),

    // Logger bonito en dev y JSON en prod
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
                translateTime: 'SYS:standard',
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

    // 👇 usa la config centralizada; solo sobreescribo logging por entorno
    TypeOrmModule.forRoot({
      ...typeOrmConfig(),
      logging: process.env.NODE_ENV !== 'production',
    }),

    UsersModule,
    AuthModule,
    CatalogModule,
    RequestsModule,
    ProvidersModule,
    NotificationsModule,
    AiModule,

  ],
})
export class AppModule { }
