import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test as NestTest } from '@nestjs/testing';
import request, { SuperTest, Test as ST } from 'supertest';
import { DataSource } from 'typeorm';

import { AppTestingModule } from '../src/app.testing.module';

describe('E2E smoke', () => {
  let app: INestApplication;
  let http: SuperTest<ST>;
  let ds: DataSource;

  beforeAll(async () => {
    const mod = await NestTest.createTestingModule({
      imports: [AppTestingModule],
    }).compile();

    app = mod.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    http = request(app.getHttpServer());      // <- acá se define http
    ds = app.get(DataSource);
  }, 30000);

  afterAll(async () => {
    await app?.close();
    if (ds?.isInitialized) await ds.destroy();
  });

  afterAll(async () => {
    await app?.close();
    if (ds?.isInitialized) {
      await ds.destroy();
    }
  });

  it('/auth/login (POST) works', async () => {
    const res = await http
      .post('/auth/login')
      .send({ email: 'prov@demo.com', password: '123456' }) // con “v”
      .expect(200);

    expect(res.body.access_token).toBeDefined();
  }, 15000);
});
