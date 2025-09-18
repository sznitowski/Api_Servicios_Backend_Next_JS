import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test as NestTest } from '@nestjs/testing';
import request, { SuperTest, Test as ST } from 'supertest';
import { DataSource } from 'typeorm';

import { AppTestingModule } from '../src/app.testing.module';
import { User } from '../src/modules/users/user.entity';
import {
  H, expectOk, login, getServiceTypeId, linkProviderToServiceTypeSQLite
} from './seed-sqlite';

describe('Notifications / badge + read-all (e2e)', () => {
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

  it('badge sube con claim y baja con read-all', async () => {
    // 1) Cliente crea un request
    const create = await http.post('/requests')
      .set(H(hcli))
      .send({ serviceTypeId, title: 'Trabajo con badge', lat: 0, lng: 0, priceOffered: 1 })
      .expect(expectOk);
    const rid = create.body?.id ?? create.body?.data?.id;

    // 2) Proveedor hace claim -> debería notificar al cliente
    await http.post(`/requests/${rid}/claim`)
      .set(H(hprov))
      .send({ priceOffered: 120 })
      .expect(expectOk);

    // 3) Badge del cliente >= 1
    const c1 = await http.get('/notifications/me/count').set(H(hcli)).expect(200);
    const total1 = Number(c1.body?.total ?? c1.body);
    expect(total1).toBeGreaterThanOrEqual(1);

    // 4) Cliente marca todas como leídas
    await http.post('/notifications/read-all').set(H(hcli)).expect(expectOk);

    // 5) Badge vuelve a 0
    const c2 = await http.get('/notifications/me/count').set(H(hcli)).expect(200);
    const total2 = Number(c2.body?.total ?? c2.body);
    expect(total2).toBe(0);
  });
});
