// src/shared/sql-now.ts
import { DataSource } from 'typeorm';

export function sqlNow(ds: DataSource) {
  const type = (ds.options as any).type;
  // SQLite
  if (type === 'sqlite' || type === 'better-sqlite3' || type === 'capacitor' || type === 'react-native') {
    return 'CURRENT_TIMESTAMP';
  }
  // MySQL/Postgres/etc.
  return 'NOW()';
}
