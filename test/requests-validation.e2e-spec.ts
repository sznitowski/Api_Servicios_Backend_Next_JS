import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test as NestTest } from '@nestjs/testing';
import supertest from 'supertest';
import { DataSource } from 'typeorm';

import { AppTestingModule } from './support/app.testing.module';
import { User, UserRole } from '../src/modules/users/user.entity';
import {
  H, expectOk, login, getServiceTypeId,
  ensureUser, linkProviderToServiceTypeSQLite
} from './seed-sqlite';

describe('Validación de inputs (e2e)', () => {
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

    // logins
    hcli  = await login(http, 'client2@demo.com');
    hprov = await login(http, 'provider1@demo.com');

    // service type
    serviceTypeId = await getServiceTypeId(http, hcli);

    // asegurar vínculo provider ↔ serviceType en SQLite
    const prov = await ds.getRepository(User).findOne({ where: { email: 'provider1@demo.com' } });
    if (prov) await linkProviderToServiceTypeSQLite(ds, prov.id, serviceTypeId);
  }, 30000);

  afterAll(async () => { await app?.close(); });

  it('serviceTypeId inexistente → 400/404', async () => {
    const badId = 999999;
    await http.post('/requests')
      .set(H(hcli))
      .send({ serviceTypeId: badId, title: 'x', lat: 0, lng: 0, priceOffered: 1 })
      .expect(res => {
        if (![400, 404].includes(res.status)) {
          throw new Error(`Debió fallar con 400/404, fue ${res.status}`);
        }
      });
  });

  it('lat/lng inválidos → 400', async () => {
    await http.post('/requests')
      .set(H(hcli))
      .send({ serviceTypeId, title: 'Trabajo X', lat: -999, lng: 999, priceOffered: 1 })
      .expect(res => {
        if (res.status !== 400) throw new Error(`Debió fallar con 400, fue ${res.status}`);
      });
  });

  it('stars fuera de rango → 400', async () => {
    // crear request válido
    const create = await http.post('/requests')
      .set(H(hcli))
      .send({ serviceTypeId, title: 'Trabajo X', lat: 0, lng: 0, priceOffered: 1 })
      .expect(expectOk);

    const rid = create.body?.id ?? create.body?.data?.id;

    // flujo mínimo para poder calificar
    await http.post(`/requests/${rid}/claim`).set(H(hprov)).expect(expectOk);
    await http.post(`/requests/${rid}/accept`).set(H(hcli)).expect(expectOk);
    await http.post(`/requests/${rid}/start`).set(H(hprov)).expect(expectOk);
    await http.post(`/requests/${rid}/complete`).set(H(hprov)).expect(expectOk);

    // calificación inválida
    await http.post(`/requests/${rid}/rate`)
      .set(H(hcli))
      .send({ stars: 10, comment: 'bad' })
      .expect(res => {
        if (res.status !== 400) throw new Error(`Debió fallar con 400, fue ${res.status}`);
      });
  });
});
