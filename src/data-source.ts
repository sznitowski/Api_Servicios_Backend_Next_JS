// src/data-source.ts
import 'reflect-metadata';
import 'dotenv/config';
import { DataSource } from 'typeorm';

const isTest = process.env.NODE_ENV === 'test';

const dataSource = new DataSource({
  type: 'mysql',
  host: process.env.DB_HOST ?? '127.0.0.1',
  port: Number(process.env.DB_PORT ?? 3306),
  username: process.env.DB_USER ?? 'root',
  password: process.env.DB_PASS ?? '',
  database: isTest
    ? (process.env.DB_NAME_TEST ?? 'services_test')
    : (process.env.DB_NAME ?? 'services_db'),

  // Para migraciones con CLI: NO usar synchronize
  synchronize: false,
  migrationsRun: false,
  logging: false,

  // Todas tus entidades *.entity.ts
  entities: ['src/**/*.entity{.ts,.js}'],

  // Carpeta de migraciones
  migrations: ['migrations/**/*{.ts,.js}'],

  // Opcional:
  // charset: 'utf8mb4',
  // timezone: 'Z',
});

export default dataSource; // 👈 ÚNICO export (no agregues otro con nombre)
