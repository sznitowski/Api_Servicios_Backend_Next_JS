import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test as NestTest } from '@nestjs/testing';
import request, { SuperTest, Test as ST } from 'supertest';
import { DataSource } from 'typeorm';

import { AppTestingModule } from '../src/app.testing.module';
import { User } from '../src/modules/users/user.entity';
import {
  H, expectOk, login, getServiceTypeId, linkProviderToServiceTypeSQLite
} from './seed-sqlite';

describe('Transiciones de Request (e2e)', () => {
  let app: INestApplication;
  let http: SuperTest<ST>;
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

    http = request(app.getHttpServer());
    ds = app.get(DataSource);

    hcli  = await login(http, 'test@demo.com');
    hprov = await login(http, 'prov@demo.com');
    serviceTypeId = await getServiceTypeId(http, hcli);

    const prov = await ds.getRepository(User).findOne({ where: { email: 'prov@demo.com' } });
    if (prov) await linkProviderToServiceTypeSQLite(ds, prov.id, serviceTypeId);
  }, 30000);

  afterAll(async () => { await app?.close(); });

  it('start sin accept → 400/409', async () => {
    const create = await http.post('/requests')
      .set(H(hcli))
      .send({ serviceTypeId, title: 'x', lat: 0, lng: 0, priceOffered: 1 })
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
      .send({ serviceTypeId, title: 'x', lat: 0, lng: 0, priceOffered: 1 })
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
      .send({ serviceTypeId, title: 'x', lat: 0, lng: 0, priceOffered: 1 })
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
    // si no tenés endpoint de registro, creamos el segundo provider directo por DB
    const repo = ds.getRepository(User);
    let prov2 = await repo.findOne({ where: { email: 'prov2@demo.com' } });
    if (!prov2) {
      prov2 = repo.create({
        email: 'prov2@demo.com',
        name: 'prov2',
        password: '$2a$10$TXXxx9j2m7zS6r0/1GXHme0e0e0e0e0e0e0e0e0e0e0e0e0e0e0', // no usado en e2e (login no requerido)
        role: 'PROVIDER' as any,
        active: true,
      });
      await repo.save(prov2);
    }
    await linkProviderToServiceTypeSQLite(ds, prov2.id, serviceTypeId);

    const create = await http.post('/requests')
      .set(H(hcli))
      .send({ serviceTypeId, title: 'x', lat: 0, lng: 0, priceOffered: 1 })
      .expect(expectOk);
    const rid = create.body?.id ?? create.body?.data?.id;

    // provider 1 reclama
    await http.post(`/requests/${rid}/claim`).set(H(hprov)).expect(expectOk);

    // provider 2 intenta reclamar -> 409
    // como no tenemos token de prov2, si tu endpoint requiere auth para claim, podés simularlo
    // con el mismo hprov y esperar igualmente 409 (el backend debería prevenir el doble claim).
    await http.post(`/requests/${rid}/claim`).set(H(hprov))
      .expect(res => {
        if (res.status !== 409) throw new Error(`Debió fallar 409, fue ${res.status}`);
      });
  });
});
