// test/providers.e2e-spec.ts
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test as NestTest } from '@nestjs/testing';
import request, { SuperTest, Test as ST } from 'supertest';
import { DataSource } from 'typeorm';
import { AppTestingModule } from '../src/app.testing.module';

// Email/pass de un PROVIDER seed (podés override con E2E_EMAIL / E2E_PASS)
const EMAIL = process.env.E2E_EMAIL ?? 'prov@demo.com';
const PASS  = process.env.E2E_PASS  ?? '123456';

// Si definís E2E_BASE, prueba contra ese server; si no, corre in-process
const BASE = process.env.E2E_BASE;
const useExternal = !!BASE;

// Header Authorization
const H = (t: string) => ({ Authorization: `Bearer ${t}` });

describe('Providers (e2e)', () => {
  let app: INestApplication | null = null; // solo si in-process
  let http: SuperTest<ST>;                 // cliente supertest (externo o in-process)
  let token = '';

  /**
   * beforeAll
   * - Modo externo: http = request(BASE)
   * - Modo in-process: levanta AppTestingModule (SQLite :memory: + seed), aplica ValidationPipe y crea http local.
   * - Hace login con un PROVIDER y guarda el access token.
   */
  beforeAll(async () => {
    if (useExternal) {
      http = request(BASE!);
    } else {
      const mod = await NestTest
        .createTestingModule({ imports: [AppTestingModule] })
        .compile();

      app = mod.createNestApplication();
      app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
      await app.init();

      http = request(app.getHttpServer());
    }

    const { status, body } = await http
      .post('/auth/login')
      .send({ email: EMAIL, password: PASS });

    expect([200, 201]).toContain(status);
    token = body.accessToken || body.access_token;
    expect(token).toBeTruthy();
  });

  /**
   * afterAll
   * - Cierra DataSource y la app si corrió in-process (evita “Force exiting Jest…”).
   */
  afterAll(async () => {
    if (app) {
      const ds = app.get(DataSource, { strict: false });
      await ds?.destroy();
      await app.close();
    }
  });

  /**
   * PATCH /providers/me -> 200
   * Upsert del perfil del provider con payload mínimo.
   * Si tu DTO exige algo, cambiá el body (p.ej., { description: '-' }).
   */
  it('PATCH /providers/me -> 200 (upsert con payload mínimo)', async () => {
    const { body, status } = await http
      .patch('/providers/me')
      .set(H(token))
      .send({ displayName: 'Prov E2E' });

    expect([200, 201]).toContain(status);
    expect(body).toBeDefined();
  });

  /**
   * GET /providers/me -> 200
   * Debe devolver el perfil del provider autenticado.
   */
  it('GET /providers/me -> 200', async () => {
    const { status } = await http
      .get('/providers/me')
      .set(H(token));

    expect(status).toBe(200);
  });

  /**
   * GET /providers/me/ratings -> 200
   * Lista de ratings (puede venir vacía).
   */
  it('GET /providers/me/ratings -> 200', async () => {
    const { status } = await http
      .get('/providers/me/ratings?page=1&limit=5')
      .set(H(token));

    expect(status).toBe(200);
  });

  /**
   * GET /providers/me/ratings/summary -> 200
   * Resumen de ratings (avg, count, etc.). Estructura depende de tu implementación.
   */
  it('GET /providers/me/ratings/summary -> 200', async () => {
    const { status } = await http
      .get('/providers/me/ratings/summary')
      .set(H(token));

    expect(status).toBe(200);
  });
});
