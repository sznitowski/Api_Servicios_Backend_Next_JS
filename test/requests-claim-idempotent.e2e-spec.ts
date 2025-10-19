// test/requests-claim-idempotent.e2e-spec.ts
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

describe('Request claim idempotente (e2e)', () => {
  let app: INestApplication;
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

    // asegurar provider vinculado al tipo de servicio
    const repo = ds.getRepository(User);
    const prov1 = await repo.findOne({ where: { email: 'provider1@demo.com' } });
    if (prov1) await linkProviderToServiceTypeSQLite(ds, prov1.id, serviceTypeId);
  }, 30000);

  afterAll(async () => { await app?.close(); });

  it('reclaim del mismo provider sin cambios → idempotente 200', async () => {
    const create = await http.post('/requests')
      .set(H(hcli))
      .send({ serviceTypeId, title: 'Idemp claim', lat: 0, lng: 0, priceOffered: 1 })
      .expect(expectOk);

    const rid = create.body?.id ?? create.body?.data?.id;

    // 1er claim con precio
    const c1 = await http.post(`/requests/${rid}/claim`).set(H(hprov))
      .send({ priceOffered: 10 })
      .expect(expectOk);
    expect(c1.body?.status ?? c1.body?.data?.status).toBe('OFFERED');
    expect(String(c1.body?.priceOffered ?? c1.body?.data?.priceOffered)).toBe('10');

    // 2º claim del mismo provider sin body → debe ser idempotente
    const c2 = await http.post(`/requests/${rid}/claim`).set(H(hprov))
      .expect(expectOk);
    expect(c2.body?.status ?? c2.body?.data?.status).toBe('OFFERED');
    expect(String(c2.body?.priceOffered ?? c2.body?.data?.priceOffered)).toBe('10');

    // 3º claim del mismo provider cambiando el precio → actualiza y sigue OFFERED
    const c3 = await http.post(`/requests/${rid}/claim`).set(H(hprov))
      .send({ priceOffered: 12 })
      .expect(expectOk);
    expect(c3.body?.status ?? c3.body?.data?.status).toBe('OFFERED');
    expect(String(c3.body?.priceOffered ?? c3.body?.data?.priceOffered)).toBe('12');
  });
});
