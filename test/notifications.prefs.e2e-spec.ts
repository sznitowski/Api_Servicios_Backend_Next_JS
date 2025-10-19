// test/notifications.prefs.e2e-spec.ts
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test as NestTest } from '@nestjs/testing';
import supertest from 'supertest';
import { DataSource } from 'typeorm';

import { AppTestingModule } from './support/app.testing.module';
import { H, expectOk, login, getServiceTypeId, linkProviderToServiceTypeSQLite } from './seed-sqlite';
import { User } from '../src/modules/users/user.entity';

describe('Notifications / preferencias (e2e)', () => {
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

    hcli  = await login(http, 'client2@demo.com');
    hprov = await login(http, 'provider1@demo.com');
    serviceTypeId = await getServiceTypeId(http, hcli);

    const prov = await ds.getRepository(User).findOne({ where: { email: 'provider1@demo.com' } });
    if (prov) await linkProviderToServiceTypeSQLite(ds, prov.id, serviceTypeId);
  }, 30000);

  afterAll(async () => { await app?.close(); });

  it('silencia OFFERED y luego lo vuelve a activar', async () => {
    // 1) Cliente silencia OFFERED
    await http.put('/notifications/prefs')
      .set(H(hcli))
      .send({ disabledTypes: ['IN_PROGRESS','DONE'] })
      .expect(expectOk);

    // 2) Cliente crea request
    const create = await http.post('/requests')
      .set(H(hcli))
      .send({ serviceTypeId, title: 'Silencio OFFERED', lat: 0, lng: 0, priceOffered: 1 })
      .expect(expectOk);
    const rid = create.body?.id ?? create.body?.data?.id;

    // 3) Proveedor hace claim (debería NO notificar al cliente por prefs)
    await http.post(`/requests/${rid}/claim`)
      .set(H(hprov))
      .send({ priceOffered: 50 })
      .expect(expectOk);

    const list1 = await http.get('/notifications/me?unseen=true')
      .set(H(hcli)).expect(expectOk);
    const items1 = list1.body.items ?? list1.body;
    const hasOffered = items1.some((n: any) => n?.type === 'OFFERED');
    expect(hasOffered).toBe(false);

    // 4) El cliente vuelve a habilitar OFFERED
    await http.put('/notifications/prefs')
      .set(H(hcli))
      .send({ disabledTypes: [] })
      .expect(expectOk);

    // 5) Nuevo request + claim -> ahora SÍ debe llegar OFFERED
    const create2 = await http.post('/requests')
      .set(H(hcli))
      .send({ serviceTypeId, title: 'Con OFFERED', lat: 0, lng: 0, priceOffered: 1 })
      .expect(expectOk);
    const rid2 = create2.body?.id ?? create2.body?.data?.id;

    await http.post(`/requests/${rid2}/claim`)
      .set(H(hprov))
      .send({ priceOffered: 60 })
      .expect(expectOk);

    const list2 = await http.get('/notifications/me?unseen=true')
      .set(H(hcli)).expect(expectOk);
    const items2 = list2.body.items ?? list2.body;
    const hasOffered2 = items2.some((n: any) => n?.type === 'OFFERED');
    expect(hasOffered2).toBe(true);
  });
});
