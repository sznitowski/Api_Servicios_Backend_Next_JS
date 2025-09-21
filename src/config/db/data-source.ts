// src/db/data-source.ts
import 'reflect-metadata';
import 'dotenv/config';
import { DataSource } from 'typeorm';

export default new DataSource({
    type: (process.env.DB_TYPE as any) || 'mysql',
    host: process.env.DB_HOST ?? '127.0.0.1',
    port: Number(process.env.DB_PORT ?? 3306),
    username: process.env.DB_USER ?? 'root',
    password: process.env.DB_PASS ?? 'admin',
    database: process.env.DB_NAME ?? 'services_db',
    synchronize: false,
    logging: false,
    // Globs robustos para correr con ts-node (src) o compilado (dist)
    entities: [
        'src/modules/**/*.entity{.ts,.js}',
        'dist/modules/**/*.entity{.ts,.js}',
    ],
    migrations: ['src/db/migrations/*.ts'],
});
