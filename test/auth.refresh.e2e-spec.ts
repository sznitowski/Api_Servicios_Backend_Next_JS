import request from 'supertest';

const BASE  = process.env.E2E_BASE  ?? 'http://localhost:3000';
const EMAIL = process.env.E2E_EMAIL ?? 'client2@demo.com';
const PASS  = process.env.E2E_PASS  ?? '123456';

describe('Auth / refresh + logout (e2e)', () => {
  let access = '';
  let refresh = '';

  it('login -> 200 (obtiene access y refresh)', async () => {
    const { status, body } = await request(BASE)
      .post('/auth/login')
      .send({ email: EMAIL, password: PASS });

    expect([200, 201]).toContain(status);
    access  = body.access_token || body.accessToken;
    refresh = body.refresh_token || body.refreshToken;

    expect(access).toBeTruthy();
    expect(refresh).toBeTruthy();
  });

  it('refresh -> 200 (renueva tokens y sirve para /auth/me)', async () => {
    const { status, body } = await request(BASE)
      .post('/auth/refresh')
      .send({ refreshToken: refresh });

    expect(status).toBe(200);
    const newAccess  = body.access_token  || body.accessToken;
    const newRefresh = body.refresh_token || body.refreshToken;

    expect(newAccess).toBeTruthy();
    expect(newRefresh).toBeTruthy();

    // usar el access renovado en /auth/me
    const me = await request(BASE)
      .get('/auth/me')
      .set('Authorization', `Bearer ${newAccess}`);

    expect(me.status).toBe(200);
    expect(me.body?.email?.toLowerCase()).toBe(EMAIL.toLowerCase());

    // guardamos el último refresh para siguiente prueba
    access = newAccess;
    refresh = newRefresh;
  });

  it('logout -> 200 y el refresh queda inválido', async () => {
    // cerrar sesión
    const out = await request(BASE)
      .post('/auth/logout')
      .set('Authorization', `Bearer ${access}`);

    expect(out.status).toBe(200);

    // intentar refrescar con el refresh token viejo debe fallar (403/401)
    const refTry = await request(BASE)
      .post('/auth/refresh')
      .send({ refreshToken: refresh });

    expect([401, 403]).toContain(refTry.status);
  });
});
