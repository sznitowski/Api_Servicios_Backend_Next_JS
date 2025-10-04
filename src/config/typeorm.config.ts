import { TypeOrmModuleOptions } from '@nestjs/typeorm';

export function typeOrmConfig(): TypeOrmModuleOptions {
  return {
    type: (process.env.DB_TYPE as any) || 'mysql',
    host: process.env.DB_HOST || 'db',
    port: Number(process.env.DB_PORT ?? 3306),
    username: process.env.DB_USER || 'app',
    password: process.env.DB_PASS || 'app',
    database: process.env.DB_NAME || 'services_db',
    autoLoadEntities: true,
    synchronize: process.env.DB_SYNC === 'true',
    logging: false,
  };
}
