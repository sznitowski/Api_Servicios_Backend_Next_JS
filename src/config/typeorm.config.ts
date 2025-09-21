import { TypeOrmModuleOptions } from '@nestjs/typeorm';

export function typeOrmConfig(): TypeOrmModuleOptions {
  const isMysql = (process.env.DB_TYPE ?? 'mysql') === 'mysql';
  return {
    type: (process.env.DB_TYPE as any) || 'mysql',
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT ?? (isMysql ? 3306 : 5432)),
    username: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    database: process.env.DB_NAME || 'services',
    autoLoadEntities: true,
    synchronize: false,  
    logging: false,
  };
}
