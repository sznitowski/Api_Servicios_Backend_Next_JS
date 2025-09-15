// scripts/seed-test.ts
import 'reflect-metadata';
import dataSource from './../data-source';
import { User, UserRole } from '../modules/users/user.entity';
import * as bcrypt from 'bcryptjs';

async function main() {
  await dataSource.initialize();

  const EMAIL = process.env.E2E_EMAIL ?? 'client2@demo.com';
  const PASS  = process.env.E2E_PASS  ?? '123456';

  const repo = dataSource.getRepository(User);

  // Cliente para e2e
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

  // Un proveedor demo (opcional, útil para otros tests)
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

  console.log('Seed OK', { clientId: user.id, providerId: prov.id });
  await dataSource.destroy();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
