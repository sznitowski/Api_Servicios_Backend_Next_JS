// test/app.e2e-spec.ts
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcryptjs';

import { AppTestingModule } from '../src/app.testing.module';
import { User, UserRole } from '../src/modules/users/user.entity';

describe('E2E smoke', () => {
  let app: INestApplication;
  let ds: DataSource;

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.JWT_SECRET = process.env.JWT_SECRET ?? 'test-secret';

    const moduleRef = await Test.createTestingModule({
      imports: [AppTestingModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    ds = app.get(DataSource);

    // Seed mínimo: usuario cliente
    const userRepo = ds.getRepository(User);
    const exists = await userRepo.findOne({ where: { email: 'test@demo.com' } });
    if (!exists) {
      const u = userRepo.create({
        email: 'test@demo.com',
        name: 'Test',
        password: await bcrypt.hash('123456', 10),
        role: UserRole.CLIENT,
        active: true,
      });
      await userRepo.save(u);
    }
  }, 30000);

  afterAll(async () => {
    await app?.close();
    if (ds?.isInitialized) {
      await ds.destroy();
    }
  });

  it('/auth/login (POST) works', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'test@demo.com', password: '123456' })
      .expect(200); // tu controller devuelve 200

    expect(res.body.access_token).toBeDefined();
  }, 15000);
});
