// test/requests-transitions.e2e-spec.ts
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test as NestTest } from '@nestjs/testing';
import supertest from 'supertest';
import { DataSource } from 'typeorm';

import { AppTestingModule } from './support/app.testing.module';
import { User } from '../src/modules/users/user.entity';
import {
  H,
  expectOk,
  login,
  getServiceTypeId,
  linkProviderToServiceTypeSQLite,
} from './seed-sqlite';

describe('Transiciones de Request (e2e)', () => {
  let app: INestApplication;
  // 👇 deja que TS infiera, o si querés tipar:  let http: ReturnType<typeof supertest>;
  let http: ReturnType<typeof supertest>;
  let ds: DataSource;

  let hcli: string;
  let hprov: string;
  let serviceTypeId: number;

  beforeAll(async () => {
    const mod = await NestTest.createTestingModule({
      imports: [AppTestingModule],
    }).compile();

    app = mod.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    http = supertest(app.getHttpServer());  
    ds = app.get(DataSource);

    hcli = await login(http, 'client2@demo.com');
    hprov = await login(http, 'provider1@demo.com');
    serviceTypeId = await getServiceTypeId(http, hcli);

    const prov = await ds.getRepository(User).findOne({ where: { email: 'provider1@demo.com' } });
    if (prov) await linkProviderToServiceTypeSQLite(ds, prov.id, serviceTypeId);
  }, 30000);

  afterAll(async () => { await app?.close(); });

  it('start sin accept → 400/409', async () => {
    const create = await http.post('/requests')
      .set(H(hcli))
      .send({ serviceTypeId, title: 'Trabajo X', lat: 0, lng: 0, priceOffered: 1 })
      .expect(expectOk);
    const rid = create.body?.id ?? create.body?.data?.id;

    await http.post(`/requests/${rid}/claim`).set(H(hprov)).expect(expectOk);

    await http.post(`/requests/${rid}/start`).set(H(hprov))
      .expect(res => {
        if (![400, 409].includes(res.status)) {
          throw new Error(`Debió fallar 400/409, fue ${res.status}`);
        }
      });
  });

  it('complete sin start → 400/409', async () => {
    const create = await http.post('/requests')
      .set(H(hcli))
      .send({ serviceTypeId, title: 'Trabajo X', lat: 0, lng: 0, priceOffered: 1 })
      .expect(expectOk);
    const rid = create.body?.id ?? create.body?.data?.id;

    await http.post(`/requests/${rid}/claim`).set(H(hprov)).expect(expectOk);
    await http.post(`/requests/${rid}/accept`).set(H(hcli)).expect(expectOk);

    await http.post(`/requests/${rid}/complete`).set(H(hprov))
      .expect(res => {
        if (![400, 409].includes(res.status)) {
          throw new Error(`Debió fallar 400/409, fue ${res.status}`);
        }
      });
  });

  it('rate doble → 400/409', async () => {
    const create = await http.post('/requests')
      .set(H(hcli))
      .send({ serviceTypeId, title: 'Trabajo X', lat: 0, lng: 0, priceOffered: 1 })
      .expect(expectOk);
    const rid = create.body?.id ?? create.body?.data?.id;

    await http.post(`/requests/${rid}/claim`).set(H(hprov)).expect(expectOk);
    await http.post(`/requests/${rid}/accept`).set(H(hcli)).expect(expectOk);
    await http.post(`/requests/${rid}/start`).set(H(hprov)).expect(expectOk);
    await http.post(`/requests/${rid}/complete`).set(H(hprov)).expect(expectOk);

    await http.post(`/requests/${rid}/rate`).set(H(hcli)).send({ stars: 5, comment: 'ok' }).expect(expectOk);

    await http.post(`/requests/${rid}/rate`).set(H(hcli)).send({ stars: 4, comment: '2nd' })
      .expect(res => {
        if (![400, 409].includes(res.status)) {
          throw new Error(`Debió fallar 400/409, fue ${res.status}`);
        }
      });
  });

  it('dos providers intentando claim → 409', async () => {
    const repo = ds.getRepository(User);
    let prov2 = await repo.findOne({ where: { email: 'provider1@demo.com' } });
    if (!prov2) {
      prov2 = repo.create({
        email: 'provider1@demo.com',
        name: 'Proveedor Demo',
        password: '$2b$10$z2yynlnp7Oj3Qbc8GdGa9uhKywGuqOcVi/tmNf9SeaHQd8NOd7EUu',
        role: 'PROVIDER' as any,
        active: true,
      });
      await repo.save(prov2);
    }
    await linkProviderToServiceTypeSQLite(ds, prov2.id, serviceTypeId);

    const create = await http.post('/requests')
      .set(H(hcli))
      .send({ serviceTypeId, title: 'Trabajo X', lat: 0, lng: 0, priceOffered: 1 })
      .expect(expectOk);
    const rid = create.body?.id ?? create.body?.data?.id;

    await http.post(`/requests/${rid}/claim`).set(H(hprov)).expect(expectOk);

    await http.post(`/requests/${rid}/claim`).set(H(hprov))
      .expect(res => {
        if (res.status !== 409) throw new Error(`Debió fallar 409, fue ${res.status}`);
      });
  });
});
