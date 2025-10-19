// test/app.e2e-spec.ts
import { createE2eApp, E2eCtx } from './support/e2e-helpers';

describe('E2E smoke', () => {
  let ctx: E2eCtx;

  beforeAll(async () => {
    ctx = await createE2eApp();
  }, 30000);

  afterAll(async () => {
    await ctx.close();
  });

  it('/auth/login (POST) works', async () => {
    const res = await ctx.http
      .post('/auth/login')
      .send({ email: 'provider1@demo.com', password: '$2b$10$z2yynlnp7Oj3Qbc8GdGa9uhKywGuqOcVi/tmNf9SeaHQd8NOd7EUu' })
      .expect(200);

    expect(res.body.access_token ?? res.body.accessToken).toBeDefined();
  });
});
