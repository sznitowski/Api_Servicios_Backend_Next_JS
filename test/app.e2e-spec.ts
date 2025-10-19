// test/app.e2e-spec.ts
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test as NestTest } from '@nestjs/testing';
import supertest from 'supertest';
import { AppTestingModule } from './support/app.testing.module';

describe('E2E smoke', () => {
  let app: INestApplication;
  let http: ReturnType<typeof supertest>;

  beforeAll(async () => {
    const mod = await NestTest.createTestingModule({ imports: [AppTestingModule] }).compile();
    app = mod.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    http = supertest(app.getHttpServer());
  }, 30000);

  afterAll(async () => {
    await app?.close();
  });

  it('/auth/login (POST) works', async () => {
    await http
      .post('/auth/login')
      .send({ email: 'test@demo.com', password: '123456' })
      .expect(200);
  });
});
