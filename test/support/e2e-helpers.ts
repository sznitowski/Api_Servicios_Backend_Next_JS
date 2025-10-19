// test/support/e2e-helpers.ts
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import supertest from 'supertest';

import { AppTestingModule } from './app.testing.module';
import { seedE2E } from '../utils/factory';

// Compat: el http puede ser SuperTest<Test> (request()) o SuperAgentTest (agent())
type HttpClient =
  ReturnType<typeof supertest> |       // SuperTest<supertest.Test>
  ReturnType<typeof supertest.agent>;  // SuperAgentTest

export type E2eCtx = {
  app: INestApplication;
  http: HttpClient;
  ds: DataSource;
  close: () => Promise<void>;
};

export async function createE2eApp(doSeed = true): Promise<E2eCtx> {
  const mod = await Test.createTestingModule({ imports: [AppTestingModule] }).compile();

  const app = mod.createNestApplication();
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  await app.init();

  const ds = app.get(DataSource);
  if (!ds.isInitialized && typeof ds.initialize === 'function') {
    await ds.initialize();
  }

  if (doSeed) await seedE2E(ds);

  // usa agent() (mantiene cookies) y lo castea al tipo de compatibilidad
  const http = supertest.agent(app.getHttpServer()) as HttpClient;

  return {
    app,
    http,
    ds,
    close: () => app.close(),
  };
}
