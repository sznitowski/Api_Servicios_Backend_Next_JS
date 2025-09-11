// test/lifecycle-rating.e2e-spec.ts
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test as NestTest } from '@nestjs/testing';
import request, { SuperTest, Test as ST } from 'supertest';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcryptjs';

import { AppTestingModule } from '../src/app.testing.module';
import { User, UserRole } from '../src/modules/users/user.entity';

describe('Lifecycle + Rating (e2e)', () => {
  let app: INestApplication;
  let http: SuperTest<ST>;
  let ds: DataSource;

  const H = (t: string) => ({ Authorization: `Bearer ${t}` });
  const expectOk = (res: any) => {
    if (![200, 201].includes(res.status)) {
      // eslint-disable-next-line no-console
      console.error('HTTP error', res.status, res.body);
      throw new Error(`Unexpected status ${res.status}`);
    }
  };

  let hcli: string;
  let hprov: string;
  let serviceTypeId: number;

  beforeAll(async () => {
    // asegurar entorno de test
    process.env.NODE_ENV = 'test';
    process.env.JWT_SECRET = process.env.JWT_SECRET ?? 'test-secret';

    const mod = await NestTest.createTestingModule({
      imports: [AppTestingModule],
    }).compile();

    app = mod.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    http = request(app.getHttpServer());

    ds = app.get(DataSource);
    if (!ds.isInitialized && typeof ds.initialize === 'function') {
      await ds.initialize();
    }

    // ---- SEED: usuarios necesarios ----
    const userRepo = ds.getRepository(User);

    const upsertUser = async (email: string, role: UserRole) => {
      let u = await userRepo.findOne({ where: { email } });
      if (!u) {
        u = userRepo.create({
          email,
          name: email.split('@')[0],
          password: await bcrypt.hash('123456', 10),
          role,
          active: true,
        });
        await userRepo.save(u);
      }
      return u;
    };

    await upsertUser('test@demo.com', UserRole.CLIENT);
    await upsertUser('prov@demo.com', UserRole.PROVIDER);

    // ---- Logins ----
    const cli = await http
      .post('/auth/login')
      .send({ email: 'test@demo.com', password: '123456' })
      .expect(expectOk);

    const prov = await http
      .post('/auth/login')
      .send({ email: 'prov@demo.com', password: '123456' })
      .expect(expectOk);

    hcli = cli.body.access_token;
    hprov = prov.body.access_token;

    // ---- Conseguir o crear un serviceTypeId ----
    const stList = await http
      .get('/catalog/service-types')
      .set(H(hcli))
      .expect(expectOk);

    serviceTypeId =
      stList.body?.items?.[0]?.id ??
      stList.body?.data?.[0]?.id ??
      stList.body?.[0]?.id;

    if (!serviceTypeId) {
      const catRes: any = await ds.query(
        `INSERT INTO categories (name, createdAt, updatedAt) VALUES (?, NOW(), NOW())`,
        ['General'],
      );
      const categoryId = catRes.insertId;

      const stRes: any = await ds.query(
        `INSERT INTO service_types (name, category_id, active, createdAt, updatedAt)
         VALUES (?, ?, 1, NOW(), NOW())`,
        ['Mudanza', categoryId],
      );
      serviceTypeId = stRes.insertId;
    }

    // ---- Asegurar provider_profile y su service type ----
    const provRow: any[] = await ds.query(
      `SELECT id FROM users WHERE email = ? LIMIT 1`,
      ['prov@demo.com'],
    );
    const provId = provRow?.[0]?.id;

    if (provId) {
      await ds.query(
        `INSERT IGNORE INTO provider_profiles (user_id, createdAt, updatedAt)
         VALUES (?, NOW(), NOW())`,
        [provId],
      );

      await ds.query(
        `INSERT IGNORE INTO provider_service_types (provider_profile_id, service_type_id)
         SELECT p.id, ? FROM provider_profiles p WHERE p.user_id = ?`,
        [serviceTypeId, provId],
      );
    }
  }, 30000);

  afterAll(async () => {
    await app?.close();
    if (ds?.isInitialized) await ds.destroy();
  });

  it('claim → accept → start → complete → rate 5', async () => {
    // Crear request (cliente)
    const create = await http
      .post('/requests')
      .set(H(hcli))
      .send({
        serviceTypeId,
        title: 'Mudanza',
        lat: -34.6037,
        lng: -58.3816,
        priceOffered: 500,
      })
      .expect(expectOk);

    const rid = create.body?.id ?? create.body?.data?.id;

    // Claim (proveedor)
    await http.post(`/requests/${rid}/claim`).set(H(hprov)).expect(expectOk);

    // Accept (cliente)
    await http.post(`/requests/${rid}/accept`).set(H(hcli)).expect(expectOk);

    // Start (proveedor)
    await http.post(`/requests/${rid}/start`).set(H(hprov)).expect(expectOk);

    // Complete (proveedor)
    await http.post(`/requests/${rid}/complete`).set(H(hprov)).expect(expectOk);

    // Rate (cliente)
    await http
      .post(`/requests/${rid}/rate`)
      .set(H(hcli))
      .send({ stars: 5, comment: 'Excelente' })
      .expect(expectOk);
  }, 20000);
});
