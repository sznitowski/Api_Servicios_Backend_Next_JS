// test/lifecycle-rating.e2e-spec.ts
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test as NestTest } from '@nestjs/testing';
import request, { SuperTest, Test as ST } from 'supertest';
import { DataSource } from 'typeorm';
import { AppTestingModule } from '../src/app.testing.module';
import { H, expectOk, login } from './utils/auth';

describe('Lifecycle + Rating (e2e)', () => {
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

    // Tokens
    hcli = await login(http, 'test@demo.com');
    hprov = await login(http, 'prov@demo.com');

    // Tomar serviceTypeId desde la API
    const st = await http.get('/catalog/service-types').set(H(hcli)).expect(expectOk);
    serviceTypeId = st.body?.items?.[0]?.id ?? st.body?.data?.[0]?.id ?? st.body?.[0]?.id;
    if (!serviceTypeId) throw new Error('No service types');
  }, 30000);

  afterAll(async () => {
    await app?.close();
    if (ds?.isInitialized) await ds.destroy();
  });

  it('claim → accept → start → complete → rate 5', async () => {
    const create = await http.post('/requests').set(H(hcli)).send({
      serviceTypeId, title: 'Mudanza', lat: -34.6037, lng: -58.3816, priceOffered: 500,
    }).expect(expectOk);

    const rid = create.body?.id ?? create.body?.data?.id;

    await http.post(`/requests/${rid}/claim`).set(H(hprov)).expect(expectOk);
    await http.post(`/requests/${rid}/accept`).set(H(hcli)).expect(expectOk);
    await http.post(`/requests/${rid}/start`).set(H(hprov)).expect(expectOk);
    await http.post(`/requests/${rid}/complete`).set(H(hprov)).expect(expectOk);

    await http.post(`/requests/${rid}/rate`).set(H(hcli))
      .send({ stars: 5, comment: 'Excelente' })
      .expect(expectOk);
  }, 20000);
});
