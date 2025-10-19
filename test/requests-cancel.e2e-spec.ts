// test/requests-cancel.e2e-spec.ts
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

describe('Cancelaciones de Request (e2e)', () => {
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

    const repo = ds.getRepository(User);
    const prov1 = await repo.findOne({ where: { email: 'provider1@demo.com' } });
    if (prov1) await linkProviderToServiceTypeSQLite(ds, prov1.id, serviceTypeId);
  }, 30000);

  afterAll(async () => { await app?.close(); });

  it('cliente puede cancelar en ACCEPTED → 200 CANCELLED', async () => {
    const create = await http.post('/requests')
      .set(H(hcli))
      .send({ serviceTypeId, title: 'cancel by client', lat: 0, lng: 0, priceOffered: 1 })
      .expect(expectOk);
    const rid = create.body?.id ?? create.body?.data?.id;

    await http.post(`/requests/${rid}/claim`).set(H(hprov)).expect(expectOk);
    await http.post(`/requests/${rid}/accept`).set(H(hcli)).expect(expectOk);

    const res = await http.post(`/requests/${rid}/cancel`)
      .set(H(hcli))
      .send({ reason: 'Cambio de plan' })
      .expect(expectOk);

    expect(res.body?.status ?? res.body?.data?.status).toBe('CANCELLED');
  });

  it('proveedor puede cancelar en OFFERED → 200 CANCELLED', async () => {
    const create = await http.post('/requests')
      .set(H(hcli))
      .send({ serviceTypeId, title: 'cancel by provider', lat: 0, lng: 0, priceOffered: 1 })
      .expect(expectOk);
    const rid = create.body?.id ?? create.body?.data?.id;

    await http.post(`/requests/${rid}/claim`).set(H(hprov)).expect(expectOk);

    const res = await http.post(`/requests/${rid}/cancel`)
      .set(H(hprov))
      .send({ reason: 'No puedo asistir' })
      .expect(expectOk);

    expect(res.body?.status ?? res.body?.data?.status).toBe('CANCELLED');
  });

  it('no se puede cancelar si está DONE → 400', async () => {
    const create = await http.post('/requests')
      .set(H(hcli))
      .send({ serviceTypeId, title: 'cancel done', lat: 0, lng: 0, priceOffered: 1 })
      .expect(expectOk);
    const rid = create.body?.id ?? create.body?.data?.id;

    await http.post(`/requests/${rid}/claim`).set(H(hprov)).expect(expectOk);
    await http.post(`/requests/${rid}/accept`).set(H(hcli)).expect(expectOk);
    await http.post(`/requests/${rid}/start`).set(H(hprov)).expect(expectOk);
    await http.post(`/requests/${rid}/complete`).set(H(hprov)).expect(expectOk);

    await http.post(`/requests/${rid}/cancel`)
      .set(H(hcli))
      .send({ reason: 'tarde' })
      .expect(res => {
        if (res.status !== 400) throw new Error(`Debió fallar 400, fue ${res.status}`);
      });
  });
});
