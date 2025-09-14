import request from 'supertest';

const BASE  = process.env.E2E_BASE  ?? 'http://localhost:3000';
const EMAIL = process.env.E2E_EMAIL ?? 'client2@demo.com';
const PASS  = process.env.E2E_PASS  ?? '123456';

describe('Users /me/addresses (e2e)', () => {
  let token = '';
  let id1: number;
  let id2: number;

  const H = () => ({ Authorization: `Bearer ${token}` });

  beforeAll(async () => {
    const { body, status } = await request(BASE)
      .post('/auth/login')
      .send({ email: EMAIL, password: PASS });
    expect([200, 201]).toContain(status);
    token = body.accessToken || body.access_token;
    expect(token).toBeTruthy();

    // 🔧 Limpieza: borro todas las direcciones previas del usuario
    const res = await request(BASE).get('/users/me/addresses').set(H());
    if (res.status === 200 && Array.isArray(res.body)) {
      for (const a of res.body) {
        await request(BASE).delete(`/users/me/addresses/${a.id}`).set(H());
      }
    }
  });

  it('lista inicial (vacía)', async () => {
    const { body, status } = await request(BASE)
      .get('/users/me/addresses')
      .set(H());
    expect(status).toBe(200);
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBe(0);
  });

  it('crea 1ra (default auto)', async () => {
    const { body, status } = await request(BASE)
      .post('/users/me/addresses')
      .set(H())
      .send({ label: 'Casa', address: 'Av Siempre Viva 742', lat: -26.8241, lng: -65.2226 });
    expect([200, 201]).toContain(status);
    id1 = body.id;
    expect(body.isDefault).toBe(true);
  });

  it('crea 2da (forzar default)', async () => {
    const { body, status } = await request(BASE)
      .post('/users/me/addresses')
      .set(H())
      .send({ label: 'Trabajo', address: 'Oficina 123', lat: -26.8, lng: -65.21, isDefault: true, notes: 'Piso 3' });
    expect([200, 201]).toContain(status);
    id2 = body.id;
    expect(body.isDefault).toBe(true);
  });

  it('lista (default primero)', async () => {
    const { body, status } = await request(BASE)
      .get('/users/me/addresses')
      .set(H());
    expect(status).toBe(200);
    expect(body[0].id).toBe(id2);
    expect(body[0].isDefault).toBe(true);
  });

  it('patch id1 -> default + cambiar label', async () => {
    const { body, status } = await request(BASE)
      .patch(`/users/me/addresses/${id1}`)
      .set(H())
      .send({ isDefault: true, label: 'Casa (edit)' });
    expect(status).toBe(200);
    expect(body.id).toBe(id1);
    expect(body.isDefault).toBe(true);
    expect(body.label).toBe('Casa (edit)');
  });

  it('delete id1', async () => {
    const { status } = await request(BASE)
      .delete(`/users/me/addresses/${id1}`)
      .set(H());
    expect([200, 204]).toContain(status);
  });

  it('verifica que id2 queda default', async () => {
    const { body, status } = await request(BASE)
      .get('/users/me/addresses')
      .set(H());
    expect(status).toBe(200);
    const found = body.find((r: any) => r.id === id2);
    expect(found?.isDefault).toBe(true);
  });
});
