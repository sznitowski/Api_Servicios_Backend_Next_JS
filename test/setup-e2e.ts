// test/setup-e2e.ts
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { AppTestingModule } from '../src/app.testing.module';
import { seedE2E } from './utils/factory';

let app: INestApplication;
let ds: DataSource;

beforeAll(async () => {
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = process.env.JWT_SECRET ?? 'test-secret';

  const mod = await Test.createTestingModule({ imports: [AppTestingModule] }).compile();
  app = mod.createNestApplication();
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  await app.init();

  ds = app.get(DataSource);
  if (!ds.isInitialized && typeof ds.initialize === 'function') {
    await ds.initialize();
  }

  await seedE2E(ds); // <- usuarios + service type + join table OK
}, 30000);

afterAll(async () => {
  await app?.close();
  if (ds?.isInitialized) await ds.destroy();
});
