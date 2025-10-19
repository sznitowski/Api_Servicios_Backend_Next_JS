// test/setup-e2e.ts
import { config } from 'dotenv';

config({ path: '.env.test' });

process.env.NODE_ENV ??= 'test';
process.env.JWT_SECRET ??= 'test-secret';

// Más margen en CI
jest.setTimeout(30_000);
