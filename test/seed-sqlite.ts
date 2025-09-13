// test/utils/seed-sqlite.ts
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User, UserRole } from '../src/modules/users/user.entity';

export const H = (t: string) => ({ Authorization: `Bearer ${t}` });
export const expectOk = (res: any) => {
  if (![200, 201].includes(res.status)) {
    // eslint-disable-next-line no-console
    console.error('HTTP error', res.status, res.body);
    throw new Error(`Unexpected status ${res.status}`);
  }
};

export async function login(http: any, email: string, password = '123456') {
  const r = await http.post('/auth/login').send({ email, password }).expect(expectOk);
  return r.body.access_token as string;
}

export async function getServiceTypeId(http: any, token: string) {
  const r = await http.get('/catalog/service-types').set(H(token)).expect(expectOk);
  return r.body?.items?.[0]?.id ?? r.body?.data?.[0]?.id ?? r.body?.[0]?.id;
}

export async function ensureUser(ds: DataSource, email: string, role: UserRole) {
  const repo = ds.getRepository(User);
  let u = await repo.findOne({ where: { email } });
  if (!u) {
    u = repo.create({
      email,
      name: email.split('@')[0],
      password: await bcrypt.hash('123456', 10),
      role,
      active: true,
    });
    await repo.save(u);
  }
  return u;
}

/**
 * Vincula al proveedor con el service type en **SQLite**, sin INFORMATION_SCHEMA.
 * Es idempotente (usa INSERT OR IGNORE si aplica) y soporta nombres de columnas distintos.
 */
export async function linkProviderToServiceTypeSQLite(
  ds: DataSource,
  providerUserId: number,
  serviceTypeId: number,
) {
  // provider_profiles (si existe)
  try {
    await ds.query(
      `INSERT INTO provider_profiles (user_id, createdAt, updatedAt)
       VALUES (?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      [providerUserId],
    );
  } catch (_) { /* puede no existir la tabla */ }

  let providerProfileId: number | undefined;
  try {
    const pr: any[] = await ds.query(
      `SELECT id FROM provider_profiles WHERE user_id = ? LIMIT 1`,
      [providerUserId],
    );
    providerProfileId = pr?.[0]?.id;
  } catch (_) { /* tabla puede no existir */ }

  // provider_service_types (si existe)
  let cols: Array<{ name: string }> = [];
  try {
    cols = await ds.query(`PRAGMA table_info('provider_service_types')`);
  } catch (_) { /* tabla no existe */ }

  if (!cols?.length) return; // nada que hacer

  const names = cols.map(c => c.name);
  const has = (n: string) => names.includes(n);

  const payload: Record<string, any> = {};

  // columna para el provider/profile
  if (providerProfileId != null) {
    if (has('provider_profile_id')) payload['provider_profile_id'] = providerProfileId;
    else if (has('providerProfileId')) payload['providerProfileId'] = providerProfileId;
  } else {
    if (has('provider_id')) payload['provider_id'] = providerUserId;
    else if (has('providerId')) payload['providerId'] = providerUserId;
  }

  // columna para el service type
  if (has('service_type_id')) payload['service_type_id'] = serviceTypeId;
  else if (has('serviceTypeId')) payload['serviceTypeId'] = serviceTypeId;

  // timestamps si existen
  if (has('createdAt')) payload['createdAt'] = { raw: 'CURRENT_TIMESTAMP' };
  if (has('updatedAt')) payload['updatedAt'] = { raw: 'CURRENT_TIMESTAMP' };

  if (Object.keys(payload).length < 2) return;

  const colsList: string[] = [];
  const qmarks: string[] = [];
  const params: any[] = [];

  for (const [k, v] of Object.entries(payload)) {
    colsList.push(k);
    if ((v as any)?.raw) qmarks.push((v as any).raw);
    else { qmarks.push('?'); params.push(v); }
  }

  const sql = `INSERT OR IGNORE INTO provider_service_types (${colsList.join(', ')})
               VALUES (${qmarks.join(', ')})`;
  await ds.query(sql, params);
}
