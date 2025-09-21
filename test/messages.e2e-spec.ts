// test/messages.e2e-spec.ts
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test as NestTest } from '@nestjs/testing';
import request, { SuperTest, Test as ST } from 'supertest';
import { DataSource } from 'typeorm';

import { AppTestingModule } from '../src/app.testing.module';
import {
  H,                 // arma el header Authorization
  expectOk,          // expect 200/201
  login,             // POST /auth/login -> access token
  getServiceTypeId,  // obtiene/crea un serviceType válido
  linkProviderToServiceTypeSQLite,
} from './seed-sqlite';
import { User } from '../src/modules/users/user.entity';

describe('Messages (e2e)', () => {
  let app: INestApplication;
  let http: SuperTest<ST>;
  let ds: DataSource;

  let hcli = '';     // bearer del cliente
  let hprov = '';    // bearer del proveedor
  let serviceTypeId: number;
  let rid: number;   // request id para chatear

  /**
   * beforeAll
   * - Levanta Nest en memoria con AppTestingModule (SQLite :memory: + seeds)
   * - Loguea cliente/proveedor
   * - Crea un Request (cliente) y hace claim (proveedor) para habilitar el chat
   */
  beforeAll(async () => {
    const mod = await NestTest.createTestingModule({ imports: [AppTestingModule] }).compile();
    app = mod.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    http = request(app.getHttpServer());
    ds = app.get(DataSource);

    hcli  = await login(http, 'test@demo.com');
    hprov = await login(http, 'prov@demo.com');

    serviceTypeId = await getServiceTypeId(http, hcli);

    // vincula provider ↔ serviceType (si la tabla puente existe)
    const prov = await ds.getRepository(User).findOne({ where: { email: 'prov@demo.com' } });
    if (prov) await linkProviderToServiceTypeSQLite(ds, prov.id, serviceTypeId);

    // crea request del cliente
    const create = await http.post('/requests')
      .set(H(hcli))
      .send({ serviceTypeId, title: 'Chat e2e', lat: 0, lng: 0, priceOffered: 10 })
      .expect(expectOk);
    rid = create.body?.id ?? create.body?.data?.id;

    // provider hace claim
    await http.post(`/requests/${rid}/claim`)
      .set(H(hprov))
      .send({ priceOffered: 12 })
      .expect(expectOk);
  });

  /** Cierre de recursos para evitar “Force exiting Jest…” */
  afterAll(async () => {
    const dataSource = app.get(DataSource, { strict: false });
    await dataSource?.destroy();
    await app.close();
  });

  /**
   * Cliente envía mensaje → debe aparecer en el listado
   */
  it('POST cliente → provider y aparece en GET', async () => {
    const sent = await http.post(`/requests/${rid}/messages`)
      .set(H(hcli))
      .send({ body: 'Hola prov (cliente → prov)' })
      .expect(expectOk);

    expect(sent.body?.id).toBeTruthy();

    const list = await http.get(`/requests/${rid}/messages`)
      .set(H(hcli))
      .expect(expectOk);

    const items = list.body.items ?? list.body;
    expect(Array.isArray(items)).toBe(true);
    const found = items.find((m: any) => m?.id === (sent.body?.id ?? sent.body?.data?.id));
    expect(found).toBeTruthy();
  });

  /**
   * Provider envía mensaje → debe aparecer en el listado
   */
  it('POST provider → cliente y aparece en GET', async () => {
    const sent = await http.post(`/requests/${rid}/messages`)
      .set(H(hprov))
      .send({ body: 'Hola cli (prov → cliente)' })
      .expect(expectOk);

    expect(sent.body?.id).toBeTruthy();

    const list = await http.get(`/requests/${rid}/messages`)
      .set(H(hprov))
      .expect(expectOk);

    const items = list.body.items ?? list.body;
    expect(Array.isArray(items)).toBe(true);
    const found = items.find((m: any) => m?.id === (sent.body?.id ?? sent.body?.data?.id));
    expect(found).toBeTruthy();
  });

  /**
   * Endpoint sin token → debe rechazar (cubre ramas de guards)
   */
  it('GET /requests/:rid/messages sin token -> 401/403', async () => {
    const r = await http.get(`/requests/${rid}/messages`); // sin Authorization
    expect([401, 403]).toContain(r.status);
  });

  /**
   * Payload inválido (body vacío) → debería fallar (400/422)
   * Si tu DTO permite vacío, podés eliminar este test.
   */
  it('POST /requests/:rid/messages body vacío -> 400/422', async () => {
    const r = await http.post(`/requests/${rid}/messages`)
      .set(H(hcli))
      .send({ body: '' });
    expect([400, 422]).toContain(r.status);
  });
});
