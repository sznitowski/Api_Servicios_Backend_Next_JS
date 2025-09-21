// test/notifications.clear.e2e-spec.ts
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test as NestTest } from '@nestjs/testing';
import request, { SuperTest, Test as ST } from 'supertest';
import { DataSource } from 'typeorm';

import { AppTestingModule } from '../src/app.testing.module';

// Helpers del proyecto para e2e sobre SQLite in-memory
import {
  H,                 // arma el header Authorization
  expectOk,          // asserter para 200/201
  login,             // hace POST /auth/login y devuelve el access token
  getServiceTypeId,  // obtiene/crea un serviceType para Requests
  linkProviderToServiceTypeSQLite, // vincula provider ↔ serviceType en la tabla puente (si existe)
} from './seed-sqlite';

import { User } from '../src/modules/users/user.entity';

describe('Notifications / clear & delete (e2e)', () => {
  let app: INestApplication;
  let http: SuperTest<ST>;
  let ds: DataSource;

  let hcli: string;        // Bearer del cliente
  let hprov: string;       // Bearer del proveedor
  let serviceTypeId: number;

  // Bootstrap de la app en memoria, con ValidationPipe y http local (no usa BASE externo)
  beforeAll(async () => {
    const mod = await NestTest.createTestingModule({ imports: [AppTestingModule] }).compile();
    app = mod.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    http = request(app.getHttpServer());
    ds = app.get(DataSource);

    // Logins contra usuarios sembrados en AppTestingModule
    hcli = await login(http, 'test@demo.com');
    hprov = await login(http, 'prov@demo.com');

    // Asegura un service type válido para crear Requests
    serviceTypeId = await getServiceTypeId(http, hcli);

    // Vincula provider ↔ service type (si existe la tabla puente)
    const prov = await ds.getRepository(User).findOne({ where: { email: 'prov@demo.com' } });
    if (prov) await linkProviderToServiceTypeSQLite(ds, prov.id, serviceTypeId);
  });

  // Cierre prolijo para evitar “Force exiting Jest…”
  afterAll(async () => {
    const dataSource = app.get(DataSource, { strict: false });
    await dataSource?.destroy();
    await app?.close();
  });

  it('clear-read elimina todas las leídas; delete elimina una puntual', async () => {
    // -------- Parte A: marcar leídas y hacer clear-read --------

    // 1) Cliente crea un request
    const create = await http.post('/requests')
      .set(H(hcli))
      .send({ serviceTypeId, title: 'Trabajo clear', lat: 0, lng: 0, priceOffered: 50 })
      .expect(expectOk);
    const rid = create.body?.id ?? create.body?.data?.id;

    // 2) Provider claim -> debe generar notificación al CLIENTE
    await http.post(`/requests/${rid}/claim`)
      .set(H(hprov))
      .send({ priceOffered: 60 })
      .expect(expectOk);

    // 3) Cliente trae no leídas; si no hay, forzamos con NEW_MESSAGE
    let unseen = await http.get('/notifications/me?unseen=true')
      .set(H(hcli))
      .expect(expectOk);

    if (!(unseen.body.items ?? unseen.body)[0]) {
      await http.post(`/requests/${rid}/messages`)
        .set(H(hprov))
        .send({ body: 'forzar notif al cliente' })
        .expect(expectOk);

      unseen = await http.get('/notifications/me?unseen=true')
        .set(H(hcli))
        .expect(expectOk);
    }

    const firstUnseen = (unseen.body.items ?? unseen.body)[0];
    await http.post(`/notifications/${firstUnseen.id}/read`)
      .set(H(hcli))
      .expect(expectOk);

    // 4) clear-read
    await http.post('/notifications/clear-read')
      .set(H(hcli))
      .expect(expectOk);

    // 5) confirmar que no quedan no leídas
    const afterClear = await http.get('/notifications/me?unseen=true')
      .set(H(hcli))
      .expect(expectOk);
    expect((afterClear.body.items ?? afterClear.body).length).toBe(0);

    // -------- Parte B: garantizar una notificación y hacer DELETE puntual --------
    // Creamos un segundo request y lo claim-ea el provider para asegurar una notificación para el CLIENTE.
    const create2 = await http.post('/requests')
      .set(H(hcli))
      .send({ serviceTypeId, title: 'Trabajo para delete', lat: 0, lng: 0, priceOffered: 80 })
      .expect(expectOk);
    const rid2 = create2.body?.id ?? create2.body?.data?.id;

    await http.post(`/requests/${rid2}/claim`)
      .set(H(hprov))
      .send({ priceOffered: 90 })
      .expect(expectOk);

    // Traemos todas y borramos una puntual
    const list3 = await http.get('/notifications/me')
      .set(H(hcli))
      .expect(expectOk);

    const anyNotif = (list3.body.items ?? list3.body)[0];
    expect(anyNotif).toBeTruthy();

    await http.delete(`/notifications/${anyNotif.id}`)
      .set(H(hcli))
      .expect(expectOk);
  });
});
