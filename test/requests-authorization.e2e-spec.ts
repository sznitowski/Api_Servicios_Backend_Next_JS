import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test as NestTest } from '@nestjs/testing';
import request, { SuperTest, Test as ST } from 'supertest';
import { DataSource } from 'typeorm';

import { AppTestingModule } from '../src/app.testing.module';
import { User } from '../src/modules/users/user.entity';
import {
  H, expectOk, login, getServiceTypeId, linkProviderToServiceTypeSQLite
} from './seed-sqlite';

describe('AuthZ / Roles (e2e)', () => {
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

  it('provider NO puede accept', async () => {
    const create = await http.post('/requests')
      .set(H(hcli))
      .send({ serviceTypeId, title: 'Trabajo X', lat: 0, lng: 0, priceOffered: 1 })
      .expect(expectOk);
    const rid = create.body?.id ?? create.body?.data?.id;

    await http.post(`/requests/${rid}/claim`).set(H(hprov)).expect(expectOk);

    await http.post(`/requests/${rid}/accept`).set(H(hprov))
      .expect(res => {
        if (![403, 401, 400].includes(res.status)) {
          throw new Error(`Debió fallar (403/401/400), fue ${res.status}`);
        }
      });
  });

  it('cliente NO puede claim/start/complete', async () => {
    const create = await http.post('/requests')
      .set(H(hcli))
      .send({ serviceTypeId, title: 'Trabajo X', lat: 0, lng: 0, priceOffered: 1 })
      .expect(expectOk);
    const rid = create.body?.id ?? create.body?.data?.id;

    // claim como cliente
    await http.post(`/requests/${rid}/claim`).set(H(hcli))
      .expect(res => {
        if (![403, 401, 400].includes(res.status)) {
          throw new Error(`Debió fallar (403/401/400), fue ${res.status}`);
        }
      });

    // start como cliente
    await http.post(`/requests/${rid}/start`).set(H(hcli))
      .expect(res => {
        if (![403, 401, 400].includes(res.status)) {
          throw new Error(`Debió fallar (403/401/400), fue ${res.status}`);
        }
      });

    // complete como cliente
    await http.post(`/requests/${rid}/complete`).set(H(hcli))
      .expect(res => {
        if (![403, 401, 400].includes(res.status)) {
          throw new Error(`Debió fallar (403/401/400), fue ${res.status}`);
        }
      });
  });
});
