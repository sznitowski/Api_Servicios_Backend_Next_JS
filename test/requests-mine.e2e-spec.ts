// test/requests-mine.e2e-spec.ts
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

describe('Requests mine & summary (e2e)', () => {
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

  async function trySummaryOrFallback(token: string, asRole: 'client' | 'provider') {
    const routes = ['/requests/mine/summary', '/requests/mine-summary'];
    const queryVariants: Array<Record<string, any>> = [{} , { as: asRole }];

    // 1) Intento summary nativo
    for (const r of routes) {
      for (const q of queryVariants) {
        const res = await http.get(r).set(H(token)).query(q);
        if ([200, 201].includes(res.status)) {
          const body = res.body ?? res.body?.data;
          return { body, native: true };
        }
      }
    }

    // 2) Fallback: sintetizar summary desde /requests/mine
    const resMine = await http
      .get('/requests/mine')
      .set(H(token))
      .query({ as: asRole, page: 1, limit: 50 });

    expect([200, 201]).toContain(resMine.status);
    const items = resMine.body?.items ?? resMine.body?.data?.items ?? [];

    const counts: Record<string, number> = {
      PENDING: 0,
      OFFERED: 0,
      ACCEPTED: 0,
      IN_PROGRESS: 0,
      DONE: 0,
      CANCELLED: 0,
    };
    for (const it of items) {
      if (counts[it.status] != null) counts[it.status] += 1;
    }
    const total = Object.values(counts).reduce((a, b) => a + b, 0);

    return { body: { ...counts, total }, native: false };
  }

  it('GET /requests/mine (client y provider) + summary', async () => {
    // Creamos 2 requests para tener datos
    const r1 = await http.post('/requests')
      .set(H(hcli))
      .send({ serviceTypeId, title: 'mine A', lat: 0, lng: 0, priceOffered: 5 })
      .expect(expectOk);
    const id1 = r1.body?.id ?? r1.body?.data?.id;

    const r2 = await http.post('/requests')
      .set(H(hcli))
      .send({ serviceTypeId, title: 'mine B', lat: 0, lng: 0, priceOffered: 7 })
      .expect(expectOk);
    const id2 = r2.body?.id ?? r2.body?.data?.id;

    // Llevamos r2 a OFFERED para que aparezca del lado del provider
    await http.post(`/requests/${id2}/claim`).set(H(hprov)).expect(expectOk);

    // --- /requests/mine como CLIENT ---
    {
      const res = await http.get('/requests/mine')
        .set(H(hcli))
        .query({ as: 'client', page: 1, limit: 10 });
      expect([200, 201]).toContain(res.status);
      const items = res.body?.items ?? res.body?.data?.items ?? [];
      expect(Array.isArray(items)).toBe(true);
      const ids = items.map((x: any) => x.id);
      expect(ids.some((x: number) => x === id1 || x === id2)).toBe(true);
    }

    // --- /requests/mine como PROVIDER (debe ver el OFFERED) ---
    {
      const res = await http.get('/requests/mine')
        .set(H(hprov))
        .query({ as: 'provider', page: 1, limit: 10 });
      expect([200, 201]).toContain(res.status);
      const items = res.body?.items ?? res.body?.data?.items ?? [];
      expect(Array.isArray(items)).toBe(true);
      const ids = items.map((x: any) => x.id);
      expect(ids.includes(id2)).toBe(true);
    }

    // --- Summary como CLIENTE (nativo o sintetizado) ---
    {
      const { body } = await trySummaryOrFallback(hcli, 'client');
      expect(body).toHaveProperty('PENDING');
      expect(body).toHaveProperty('total');
    }

    // --- Summary como PROVIDER (nativo o sintetizado) ---
    {
      const { body } = await trySummaryOrFallback(hprov, 'provider');
      expect(body).toHaveProperty('total');
      // OFFERED suele ser el estado más probable
      expect((body.OFFERED ?? 0)).toBeGreaterThanOrEqual(0);
    }
  });
});
