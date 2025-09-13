// test/utils/factory.ts
import * as bcrypt from 'bcryptjs';
import { DataSource } from 'typeorm';
import { User, UserRole } from '../../src/modules/users/user.entity';

export async function upsertUser(ds: DataSource, email: string, role: UserRole) {
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

export async function ensureCategoryAndServiceType(ds: DataSource) {
  // Intento 1: ya existe alguno activo
  const [st] = await ds.query(`SELECT id FROM service_types WHERE active = 1 LIMIT 1`);
  if (st?.id) return st.id;

  // Creo categoría y service type activo
  const catRes: any = await ds.query(
    `INSERT INTO categories (name, createdAt, updatedAt) VALUES (?, NOW(), NOW())`,
    ['General'],
  );

  const stRes: any = await ds.query(
    `INSERT INTO service_types (name, category_id, active, createdAt, updatedAt)
     VALUES (?, ?, 1, NOW(), NOW())`,
    ['Mudanza', catRes.insertId],
  );
  return stRes.insertId as number;
}

export async function ensureProviderSetup(
  ds: DataSource,
  providerEmail: string,
  serviceTypeId: number,
) {
  const provRow: any[] = await ds.query(`SELECT id FROM users WHERE email = ? LIMIT 1`, [providerEmail]);
  const provId = provRow?.[0]?.id;
  if (!provId) return;

  // provider_profiles (si existe)
  try {
    await ds.query(
      `INSERT IGNORE INTO provider_profiles (user_id, createdAt, updatedAt)
       VALUES (?, NOW(), NOW())`,
      [provId],
    );
  } catch (_) {
    // si no existe la tabla, seguimos (algunos esquemas linkean directo users<->service_types)
  }

  // Tomo profileId si aplica
  let profileId: number | undefined;
  try {
    const pr: any[] = await ds.query(`SELECT id FROM provider_profiles WHERE user_id = ? LIMIT 1`, [provId]);
    profileId = pr?.[0]?.id;
  } catch (_) { /* opcional */ }

  // Descubro FKs reales de la join table
  const fks: Array<{ COLUMN_NAME: string; REFERENCED_TABLE_NAME: string }> = await ds.query(`
    SELECT COLUMN_NAME, REFERENCED_TABLE_NAME
    FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'provider_service_types'
      AND REFERENCED_TABLE_NAME IS NOT NULL
  `);

  let colToVal: Record<string, any> = {};
  for (const fk of fks) {
    if (fk.REFERENCED_TABLE_NAME === 'service_types') {
      colToVal[fk.COLUMN_NAME] = serviceTypeId;
    } else if (fk.REFERENCED_TABLE_NAME === 'provider_profiles' && profileId != null) {
      colToVal[fk.COLUMN_NAME] = profileId;
    } else if (fk.REFERENCED_TABLE_NAME === 'users') {
      colToVal[fk.COLUMN_NAME] = provId;
    }
  }

  // Fallback si no hay FKs declaradas
  if (Object.keys(colToVal).length === 0) {
    const colsInfo: any[] = await ds.query(`SHOW COLUMNS FROM provider_service_types`);
    const has = (n: string) => colsInfo.some(c => (c.Field ?? c.COLUMN_NAME) === n);

    if (has('provider_profile_id') && has('service_type_id') && profileId != null) {
      colToVal = { provider_profile_id: profileId, service_type_id: serviceTypeId };
    } else if (has('providerProfileId') && has('serviceTypeId') && profileId != null) {
      colToVal = { providerProfileId: profileId, serviceTypeId: serviceTypeId };
    } else if (has('provider_id') && has('service_type_id')) {
      colToVal = { provider_id: provId, service_type_id: serviceTypeId };
    } else if (has('providerId') && has('serviceTypeId')) {
      colToVal = { providerId: provId, serviceTypeId: serviceTypeId };
    }
  }

  if (Object.keys(colToVal).length === 0) return;

  const colsInfo: any[] = await ds.query(`SHOW COLUMNS FROM provider_service_types`);
  const names = colsInfo.map(c => c.Field ?? c.COLUMN_NAME);
  const needCreated = names.includes('createdAt');
  const needUpdated = names.includes('updatedAt');

  const cols = Object.keys(colToVal);
  const qmarks = cols.map(() => '?');
  const values = Object.values(colToVal);

  if (needCreated) { cols.push('createdAt'); qmarks.push('NOW()'); }
  if (needUpdated) { cols.push('updatedAt'); qmarks.push('NOW()'); }

  const sql = `INSERT IGNORE INTO provider_service_types (${cols.join(', ')}) VALUES (${qmarks.join(', ')})`;
  const params = values.filter((_, i) => i < Object.values(colToVal).length);
  await ds.query(sql, params);
}

export async function seedE2E(ds: DataSource) {
  await upsertUser(ds, 'test@demo.com', UserRole.CLIENT);
  await upsertUser(ds, 'prov@demo.com', UserRole.PROVIDER);
  const serviceTypeId = await ensureCategoryAndServiceType(ds);
  await ensureProviderSetup(ds, 'prov@demo.com', serviceTypeId);
  return { serviceTypeId };
}
