// test/app.e2e-spec.ts
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';                 // ✅ import default
import { AppTestingModule } from '../src/app.testing.module';

describe('E2E smoke', () => {
  let app: INestApplication;

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.JWT_SECRET = process.env.JWT_SECRET ?? 'test-secret'; // ✅

    const moduleRef = await Test.createTestingModule({
      imports: [AppTestingModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
  }, 20000);

  afterAll(async () => {
    await app?.close();
  });

  it('/auth/login (POST) works', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'test@demo.com', password: '123456' })
      .expect(200); // usa 200 si tu controller tiene @HttpCode(200)

    expect(res.body.access_token).toBeDefined();
  }, 15000);
});
