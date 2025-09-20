// test/notifications.clear.e2e-spec.ts
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test as NestTest } from '@nestjs/testing';
import request, { SuperTest, Test as ST } from 'supertest';
import { DataSource } from 'typeorm';

import { AppTestingModule } from '../src/app.testing.module';
import { H, expectOk, login, getServiceTypeId, linkProviderToServiceTypeSQLite } from './seed-sqlite';
import { User } from '../src/modules/users/user.entity';

describe('Notifications / clear & delete (e2e)', () => {
  let app: INestApplication;
  let http: SuperTest<ST>;
  let ds: DataSource;

  let hcli: string;
  let hprov: string;
  let serviceTypeId: number;

  beforeAll(async () => {
    const mod = await NestTest.createTestingModule({ imports: [AppTestingModule] }).compile();
    app = mod.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    http = request(app.getHttpServer());
    ds = app.get(DataSource);

    hcli = await login(http, 'test@demo.com');
    hprov = await login(http, 'prov@demo.com');
    serviceTypeId = await getServiceTypeId(http, hcli);

    const prov = await ds.getRepository(User).findOne({ where: { email: 'prov@demo.com' } });
    if (prov) await linkProviderToServiceTypeSQLite(ds, prov.id, serviceTypeId);
  });

  afterAll(async () => { await app?.close(); });

  it('clear-read elimina todas las leídas; delete elimina una puntual', async () => {
    // 1) Cliente crea request
    const create = await http.post('/requests')
      .set(H(hcli))
      .send({ serviceTypeId, title: 'Trabajo clear', lat: 0, lng: 0, priceOffered: 50 })
      .expect(expectOk);
    const rid = create.body?.id ?? create.body?.data?.id;

    // 2) Provider claim -> genera notif a cliente
    await http.post(`/requests/${rid}/claim`).set(H(hprov)).send({ priceOffered: 60 }).expect(expectOk);

    // 3) Cliente trae no leídas y marca la primera como leída
    const list1 = await http.get('/notifications/me?unseen=true').set(H(hcli)).expect(expectOk);
    const first = (list1.body.items ?? list1.body)[0];
    await http.post(`/notifications/${first.id}/read`).set(H(hcli)).expect(expectOk);

    // 4) Cliente clear-read
    await http.post('/notifications/clear-read').set(H(hcli)).expect(expectOk);

    // 5) Verifica que no queden leídas de ese usuario
    const list2 = await http.get('/notifications/me?unseen=true').set(H(hcli)).expect(expectOk);
    expect((list2.body.items ?? list2.body).length).toBe(0);

    // 6) Crea otra notificación y luego DELETE puntual
    await http.post(`/requests/${rid}/accept`).set(H(hcli)).send({ priceAgreed: 55 }).expect(expectOk);
    const list3 = await http.get('/notifications/me').set(H(hcli)).expect(expectOk);
    const anyNotif = (list3.body.items ?? list3.body)[0];
    await http.delete(`/notifications/${anyNotif.id}`).set(H(hcli)).expect(expectOk);
  });
});
