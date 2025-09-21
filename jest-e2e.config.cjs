// jest-e2e.config.cjs
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: '.',
  testMatch: ['**/test/**/*.e2e-spec.ts'],
  moduleFileExtensions: ['ts', 'js', 'json'],

  // === Cobertura ===
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageProvider: 'v8',
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/main.ts',
    '!src/main.testing.ts',
    '!src/app.module.ts',
    '!src/**/*.module.ts',
    '!src/**/migrations/**',
    // extras que suelen inflar sin lógica:
    '!src/**/dto/**',
    '!src/**/entities/**',
    '!src/**/guards/**',
    '!src/**/interceptors/**',
    '!src/**/filters/**',
    '!src/**/pipes/**',
  ],
  coverageReporters: ['text-summary', 'lcov', 'html'],
  coverageThreshold: {
    global: { lines: 60, statements: 60, branches: 43, functions: 60 },
  },
};
