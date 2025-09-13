// test/utils/auth.ts
import { SuperTest, Test as ST } from 'supertest';

export const H = (t: string) => ({ Authorization: `Bearer ${t}` });

export const expectOk = (res: any) => {
  if (![200, 201].includes(res.status)) {
    // eslint-disable-next-line no-console
    console.error('HTTP error', res.status, res.body);
    throw new Error(`Unexpected status ${res.status}`);
  }
};

export async function login(http: SuperTest<ST>, email: string, password = '123456') {
  const r = await http.post('/auth/login').send({ email, password }).expect(expectOk);
  return r.body.access_token as string;
}
