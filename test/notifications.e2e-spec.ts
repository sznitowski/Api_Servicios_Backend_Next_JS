import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test as NestTest } from '@nestjs/testing';
import supertest from 'supertest';
import { DataSource } from 'typeorm';

import { AppTestingModule } from './support/app.testing.module';
import {
  H, expectOk, login, getServiceTypeId, linkProviderToServiceTypeSQLite
} from './seed-sqlite';

describe('Notifications (e2e)', () => {
  let app: INestApplication;
  let http: ReturnType<typeof supertest>;
  let ds: DataSource;

  let hcli: string;     // bearer del cliente
  let hprov: string;    // bearer del proveedor
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

    // logins y set up básico
    hcli  = await login(http, 'client2@demo.com');
    hprov = await login(http, 'provider1@demo.com');
    serviceTypeId = await getServiceTypeId(http, hcli);

    // vincular proveedor al tipo de servicio (en sqlite helper)
    await linkProviderToServiceTypeSQLite(ds, 2 /* prov id por seed */, serviceTypeId);
  }, 30000);

  afterAll(async () => { await app?.close(); });

  it('genera notificación a CLIENTE al claim del proveedor y a PROVIDER al accept del cliente', async () => {
    // 1) Cliente crea request
    const create = await http.post('/requests')
      .set(H(hcli))
      .send({ serviceTypeId, title: 'Trabajo con notifs', lat: 0, lng: 0, priceOffered: 100 })
      .expect(expectOk);

    const rid = create.body?.id ?? create.body?.data?.id;

    // 2) Proveedor hace claim (debería notificar al cliente)
    await http.post(`/requests/${rid}/claim`)
      .set(H(hprov))
      .send({ priceOffered: 120 })
      .expect(expectOk);

    // 3) Cliente lista sus notificaciones no leídas
    const listCli1 = await http.get('/notifications/me?unseen=true')
      .set(H(hcli))
      .expect(expectOk);

    expect(Array.isArray(listCli1.body?.items ?? listCli1.body)).toBe(true);
    const itemsCli1 = listCli1.body.items ?? listCli1.body;
    expect(itemsCli1.length).toBeGreaterThanOrEqual(1);
    const notifClaim = itemsCli1.find((n: any) => n?.type === 'OFFERED');
    expect(notifClaim).toBeTruthy();

    // 4) Cliente marca como leída esa notificación
    await http.post(`/notifications/${notifClaim.id}/read`)
      .set(H(hcli))
      .expect(expectOk);

    // 5) Cliente acepta (debería notificar al proveedor)
    await http.post(`/requests/${rid}/accept`)
      .set(H(hcli))
      .send({ priceAgreed: 115 })
      .expect(expectOk);

    // 6) Proveedor lista sus no leídas y encuentra ACCEPTED
    const listProv1 = await http.get('/notifications/me?unseen=true')
      .set(H(hprov))
      .expect(expectOk);

    const itemsProv1 = listProv1.body.items ?? listProv1.body;
    const notifAccepted = itemsProv1.find((n: any) => n?.type === 'ACCEPTED');
    expect(notifAccepted).toBeTruthy();

    // 7) Proveedor marca todas como leídas
    await http.post('/notifications/read-all')
      .set(H(hprov))
      .expect(expectOk);

    const listProv2 = await http.get('/notifications/me?unseen=true')
      .set(H(hprov))
      .expect(expectOk);

    const itemsProv2 = listProv2.body.items ?? listProv2.body;
    expect(itemsProv2.length).toBe(0);
  });
});
