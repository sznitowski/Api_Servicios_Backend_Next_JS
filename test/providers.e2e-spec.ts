import request from 'supertest';

const BASE  = process.env.E2E_BASE  ?? 'http://localhost:3000';
const EMAIL = process.env.E2E_EMAIL ?? 'client2@demo.com';
const PASS  = process.env.E2E_PASS  ?? '123456';

describe('Providers (e2e)', () => {
  let token = '';
  const H = () => ({ Authorization: `Bearer ${token}` });

  beforeAll(async () => {
    const { body, status } = await request(BASE)
      .post('/auth/login')
      .send({ email: EMAIL, password: PASS });
    expect([200, 201]).toContain(status);
    token = body.accessToken || body.access_token;
    expect(token).toBeTruthy();
  });

  it('PATCH /providers/me -> 200 (upsert con payload mínimo)', async () => {
    const { body, status } = await request(BASE)
      .patch('/providers/me')
      .set(H())
      .send({ displayName: 'Prov E2E' }); // 👈 mínimo para evitar validaciones raras
    expect([200, 201]).toContain(status);
    expect(body).toBeDefined();
  });

  it('GET /providers/me -> 200', async () => {
    const { status } = await request(BASE)
      .get('/providers/me')
      .set(H());
    expect(status).toBe(200);
  });

  it('GET /providers/me/ratings -> 200', async () => {
    const { status } = await request(BASE)
      .get('/providers/me/ratings?page=1&limit=5')
      .set(H());
    expect(status).toBe(200);
  });

  it('GET /providers/me/ratings/summary -> 200', async () => {
    const { status } = await request(BASE)
      .get('/providers/me/ratings/summary')
      .set(H());
    expect(status).toBe(200);
  });
});
