// src/scripts/seed-test.ts
import 'reflect-metadata';
import dataSource from '../config/db/data-source';
import { User, UserRole } from '../modules/users/user.entity';
import * as bcrypt from 'bcryptjs';

async function main() {
  await dataSource.initialize();

  const EMAIL = process.env.E2E_EMAIL ?? 'client2@demo.com';
  const PASS  = process.env.E2E_PASS  ?? '123456';

  const repo = dataSource.getRepository(User);

  // --- Cliente demo ---
  let user = await repo.findOne({ where: { email: EMAIL } });
  const hash = bcrypt.hashSync(PASS, 10);

  if (!user) {
    user = repo.create({
      email: EMAIL,
      name: 'Cliente Demo',
      role: UserRole.CLIENT,
      password: hash,
      active: true,
    });
  } else {
    user.name = 'Cliente Demo';
    user.role = UserRole.CLIENT;
    user.password = hash;
    user.active = true;
  }
  await repo.save(user);

  // --- Proveedor demo ---
  let prov = await repo.findOne({ where: { email: 'provider1@demo.com' } });
  if (!prov) {
    prov = repo.create({
      email: 'provider1@demo.com',
      name: 'Proveedor Demo',
      role: UserRole.PROVIDER,
      password: bcrypt.hashSync('123456', 10),
      active: true,
    });
  } else {
    prov.name = 'Proveedor Demo';
    prov.role = UserRole.PROVIDER;
    prov.password = bcrypt.hashSync('123456', 10);
    prov.active = true;
  }
  await repo.save(prov);

  // --- Service Type mínimo "General" (dev) ---
  const ds = dataSource;
  let serviceTypeId: number | null = null;

  // 1) ¿ya hay alguno?
  try {
    const rows = await ds.query(`SELECT id FROM service_types ORDER BY id ASC LIMIT 1`);
    if (rows?.length) serviceTypeId = rows[0].id;
  } catch {
    try {
      const rows = await ds.query(`SELECT id FROM service_type ORDER BY id ASC LIMIT 1`);
      if (rows?.length) serviceTypeId = rows[0].id;
    } catch {}
  }

  // 2) crear uno si no existe (probando distintos esquemas)
  if (!serviceTypeId) {
    const tries = [
      `INSERT INTO service_types (name, active) VALUES ('General', 1)`,
      `INSERT INTO service_types (name) VALUES ('General')`,
      `INSERT INTO service_type (name, active) VALUES ('General', 1)`,
      `INSERT INTO service_type (name) VALUES ('General')`,
      `INSERT INTO service_types (name, active, created_at, updated_at) VALUES ('General', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      `INSERT INTO service_types (name, active, createdAt, updatedAt) VALUES ('General', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
    ];
    for (const sql of tries) {
      try { await ds.query(sql); break; } catch {}
    }

    // re-leer id
    try {
      const rows = await ds.query(`SELECT id FROM service_types ORDER BY id ASC LIMIT 1`);
      if (rows?.length) serviceTypeId = rows[0].id;
    } catch {
      try {
        const rows = await ds.query(`SELECT id FROM service_type ORDER BY id ASC LIMIT 1`);
        if (rows?.length) serviceTypeId = rows[0].id;
      } catch {}
    }
  }

  // 3) Vincular provider demo a ese service type (si existe join table)
  if (serviceTypeId && prov?.id) {
    const linkTries = [
      `INSERT IGNORE INTO providers_service_types (provider_id, service_type_id) VALUES (?, ?)`,
      `INSERT IGNORE INTO provider_service_types (provider_id, service_type_id) VALUES (?, ?)`,
      `INSERT IGNORE INTO provider_service_type (provider_id, service_type_id) VALUES (?, ?)`,
      `INSERT OR IGNORE INTO providers_service_types (provider_id, service_type_id) VALUES (?, ?)`,
      `INSERT OR IGNORE INTO provider_service_types (provider_id, service_type_id) VALUES (?, ?)`,
      `INSERT OR IGNORE INTO provider_service_type (provider_id, service_type_id) VALUES (?, ?)`,
      `INSERT OR IGNORE INTO provider_service_types_service_type ("providerId","serviceTypeId") VALUES (?, ?)`,
    ];
    for (const sql of linkTries) {
      try { await ds.query(sql, [prov.id, serviceTypeId]); break; } catch {}
    }
  }

  console.log('Seed OK', { clientId: user.id, providerId: prov.id, serviceTypeId });
  await dataSource.destroy();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
