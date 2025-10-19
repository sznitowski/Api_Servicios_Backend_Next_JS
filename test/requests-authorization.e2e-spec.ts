// test/requests-authorization.e2e-spec.ts
//
// Suite E2E para probar **autorización por roles** sobre el flujo de Requests.
// Valida que:
//  - Un PROVIDER puede "claim" un request, pero **no** puede "accept/start/complete".
//  - Un CLIENT puede crear el request, pero **no** puede "claim/start/complete".
//
// Helpers importados:
//  - H(token): construye el header Authorization: Bearer <token>
//  - expectOk: aserción común 200/201
//  - login(http, email, pass?): hace POST /auth/login y devuelve access_token
//  - getServiceTypeId(http, h): obtiene un serviceType válido para crear requests
//  - linkProviderToServiceTypeSQLite(ds, providerId, stId): vincula provider con el service type en SQLite
//
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

// 🔹 Helper local: aserción "debería fallar" aceptando 401/403/400.
// Evita repetir el mismo bloque en varias expectativas.
const expectForbiddenish = (res: { status: number }) => {
  if (![403, 401, 400].includes(res.status)) {
    throw new Error(`Debió fallar (403/401/400), fue ${res.status}`);
  }
};

describe('AuthZ / Roles (e2e)', () => {
  let app: INestApplication;
  let http: ReturnType<typeof supertest>;
  let ds: DataSource;

  let hcli: string;      // token del cliente (Authorization header)
  let hprov: string;     // token del proveedor
  let serviceTypeId: number;

  beforeAll(async () => {
    // 1) Levantamos la app de testing con pipes (whitelist/transform)
    const mod = await NestTest.createTestingModule({
      imports: [AppTestingModule],
    }).compile();

    app = mod.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    // 2) HTTP client y datasource para helpers que tocan DB
    http = supertest(app.getHttpServer()); 
    ds = app.get(DataSource);

    // 3) Login de cliente y provider (helpers encapsulan POST /auth/login)
    hcli = await login(http, 'client2@demo.com');
    hprov = await login(http, 'provider1@demo.com');

    // 4) Recuperar un service type y asegurar que el provider esté vinculado
    serviceTypeId = await getServiceTypeId(http, hcli);

    const prov = await ds
      .getRepository(User)
      .findOne({ where: { email: 'provider1@demo.com' } });

    if (prov) {
      await linkProviderToServiceTypeSQLite(ds, prov.id, serviceTypeId);
    }
  }, 30000);

  afterAll(async () => {
    await app?.close();
  });

  it('provider NO puede accept', async () => {
    // 1) El cliente crea un request válido
    const create = await http
      .post('/requests')
      .set(H(hcli))
      .send({
        serviceTypeId,
        title: 'Trabajo X',
        lat: 0,
        lng: 0,
        priceOffered: 1,
      })
      .expect(expectOk);

    const rid = create.body?.id ?? create.body?.data?.id;

    // 2) El proveedor lo reclama correctamente
    await http.post(`/requests/${rid}/claim`).set(H(hprov)).expect(expectOk);

    // 3) Pero NO debería poder aceptarlo (403/401/400)
    await http
      .post(`/requests/${rid}/accept`)
      .set(H(hprov))
      .expect(expectForbiddenish);
  });

  it('cliente NO puede claim/start/complete', async () => {
    // 1) El cliente crea otro request válido
    const create = await http
      .post('/requests')
      .set(H(hcli))
      .send({
        serviceTypeId,
        title: 'Trabajo X',
        lat: 0,
        lng: 0,
        priceOffered: 1,
      })
      .expect(expectOk);

    const rid = create.body?.id ?? create.body?.data?.id;

    // 2) Como CLIENTE, no puede reclamarlo
    await http
      .post(`/requests/${rid}/claim`)
      .set(H(hcli))
      .expect(expectForbiddenish);

    // 3) Tampoco puede iniciarlo
    await http
      .post(`/requests/${rid}/start`)
      .set(H(hcli))
      .expect(expectForbiddenish);

    // 4) Ni completarlo
    await http
      .post(`/requests/${rid}/complete`)
      .set(H(hcli))
      .expect(expectForbiddenish);
  });
});
