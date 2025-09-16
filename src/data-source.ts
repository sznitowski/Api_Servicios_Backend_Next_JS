// src/data-source.ts
import 'reflect-metadata';
import 'dotenv/config';
import { DataSource } from 'typeorm';

export default new DataSource({
  type: 'mysql',
  host: process.env.DB_HOST ?? '127.0.0.1',
  port: Number(process.env.DB_PORT ?? 3306),
  username: process.env.DB_USER ?? 'root',
  password: process.env.DB_PASS ?? 'admin',
  database: process.env.DB_NAME ?? 'services_db',
  synchronize: false,
  logging: false,
  // Usa solo patrones; como corrés con ts-node, .ts está bien.
  // (Este dataSource es para CLI; en prod Nest usa su propio TypeOrmModule)
  entities: [
    'src/modules/**/*.entity{.ts,.js}',
    'src/**/*.entity{.ts,.js}',
  ],
  migrations: ['migrations/**/*{.ts,.js}'],
});
