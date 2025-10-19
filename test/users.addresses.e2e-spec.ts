// test/users.addresses.e2e-spec.ts
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test as NestTest } from '@nestjs/testing';
import supertest from 'supertest';
import { DataSource } from 'typeorm';
import { AppTestingModule } from './support/app.testing.module';

const EMAIL = process.env.E2E_EMAIL ?? 'client2@demo.com';
const PASS  = process.env.E2E_PASS  ?? '123456';
const H = (t: string) => ({ Authorization: `Bearer ${t}` });

describe('Users /me/addresses (e2e)', () => {
  let app: INestApplication;
  let http: ReturnType<typeof supertest>;
  let token = '';
  let id1: number;
  let id2: number;

  // Levanta app Nest de testing en memoria y prepara cliente http
  beforeAll(async () => {
    const mod = await NestTest.createTestingModule({ imports: [AppTestingModule] }).compile();
    app = mod.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
  http = supertest(app.getHttpServer());

    // Login con usuario seed
    const { body, status } = await http.post('/auth/login').send({ email: EMAIL, password: PASS });
    expect([200, 201]).toContain(status);
    token = body.accessToken || body.access_token;
    expect(token).toBeTruthy();

    // Limpieza: borra direcciones previas (si hubiera) para tener un estado conocido
    const res = await http.get('/users/me/addresses').set(H(token));
    if (res.status === 200 && Array.isArray(res.body)) {
      for (const a of res.body) {
        await http.delete(`/users/me/addresses/${a.id}`).set(H(token));
      }
    }
  });

  afterAll(async () => {
    const ds = app.get(DataSource, { strict: false });
    await ds?.destroy();
    await app.close();
  });

  it('lista inicial (vacía)', async () => {
    const { body, status } = await http.get('/users/me/addresses').set(H(token));
    expect(status).toBe(200);
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBe(0);
  });

  it('crea 1ra (default auto)', async () => {
    const { body, status } = await http
      .post('/users/me/addresses')
      .set(H(token))
      .send({ label: 'Casa', address: 'Av Siempre Viva 742', lat: -26.8241, lng: -65.2226 });
    expect([200, 201]).toContain(status);
    id1 = body.id;
    expect(body.isDefault).toBe(true);
  });

  it('crea 2da (forzar default)', async () => {
    const { body, status } = await http
      .post('/users/me/addresses')
      .set(H(token))
      .send({ label: 'Trabajo', address: 'Oficina 123', lat: -26.8, lng: -65.21, isDefault: true, notes: 'Piso 3' });
    expect([200, 201]).toContain(status);
    id2 = body.id;
    expect(body.isDefault).toBe(true);
  });

  it('lista (default primero)', async () => {
    const { body, status } = await http.get('/users/me/addresses').set(H(token));
    expect(status).toBe(200);
    expect(body[0].id).toBe(id2);
    expect(body[0].isDefault).toBe(true);
  });

  it('patch id1 -> default + cambiar label', async () => {
    const { body, status } = await http
      .patch(`/users/me/addresses/${id1}`)
      .set(H(token))
      .send({ isDefault: true, label: 'Casa (edit)' });
    expect(status).toBe(200);
    expect(body.id).toBe(id1);
    expect(body.isDefault).toBe(true);
    expect(body.label).toBe('Casa (edit)');
  });

  it('delete id1', async () => {
    const { status } = await http.delete(`/users/me/addresses/${id1}`).set(H(token));
    expect([200, 204]).toContain(status);
  });

  it('verifica que id2 queda default', async () => {
    const { body, status } = await http.get('/users/me/addresses').set(H(token));
    expect(status).toBe(200);
    const found = body.find((r: any) => r.id === id2);
    expect(found?.isDefault).toBe(true);
  });
});
