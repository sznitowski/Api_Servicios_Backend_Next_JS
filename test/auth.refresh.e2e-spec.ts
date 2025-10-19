// test/auth.refresh.e2e-spec.ts
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test as NestTest } from '@nestjs/testing';
import supertest from 'supertest';
import { DataSource } from 'typeorm';
import { AppTestingModule } from './support/app.testing.module';

const H = (t: string) => ({ Authorization: `Bearer ${t}` });
const EMAIL = process.env.E2E_EMAIL ?? 'client2@demo.com';
const PASS = process.env.E2E_PASS ?? '123456';

describe('Auth / refresh + logout (e2e)', () => {
  let app: INestApplication;
  let http: ReturnType<typeof supertest>;
  let access = '';
  let refresh = '';

  // App Nest en memoria (mismo módulo que el resto de e2e)
  beforeAll(async () => {
    const mod = await NestTest.createTestingModule({ imports: [AppTestingModule] }).compile();
    app = mod.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
    http = supertest(app.getHttpServer());
  });

  afterAll(async () => {
    const ds = app.get(DataSource, { strict: false });
    await ds?.destroy();
    await app.close();
  });

  it('login -> 200 (obtiene access y refresh)', async () => {
    const { status, body } = await http.post('/auth/login').send({ email: EMAIL, password: PASS });
    expect([200, 201]).toContain(status);
    access = body.access_token || body.accessToken;
    refresh = body.refresh_token || body.refreshToken;
    expect(access).toBeTruthy();
    expect(refresh).toBeTruthy();
  });

  it('refresh -> 200 (renueva tokens y sirve para /auth/me)', async () => {
    const { status, body } = await http.post('/auth/refresh').send({ refreshToken: refresh });
    expect(status).toBe(200);
    const newAccess = body.access_token || body.accessToken;
    const newRefresh = body.refresh_token || body.refreshToken;
    expect(newAccess).toBeTruthy();
    expect(newRefresh).toBeTruthy();
    const me = await http.get('/auth/me').set(H(newAccess));
    expect(me.status).toBe(200);
    expect(me.body?.email?.toLowerCase()).toBe(EMAIL.toLowerCase());
    access = newAccess; refresh = newRefresh;
  });

  it('logout -> 200 y el refresh queda inválido', async () => {
    const out = await http.post('/auth/logout').set(H(access));
    expect(out.status).toBe(200);
    const refTry = await http.post('/auth/refresh').send({ refreshToken: refresh });
    expect([401, 403]).toContain(refTry.status);
  });

  it('refresh con token malformado -> 401/403', async () => {
    const res = await http.post('/auth/refresh').send({ refreshToken: '___INVALID___' });
    expect([401, 403]).toContain(res.status);
  });

  it('login con password inválido -> 400/401', async () => {
    const bad = await http.post('/auth/login').send({ email: EMAIL, password: 'xxx' });
    expect([400, 401]).toContain(bad.status);
  });

  it('GET /auth/me sin token -> 401/403', async () => {
    const r = await http.get('/auth/me'); // sin Authorization
    expect([401, 403]).toContain(r.status);
  });
});
