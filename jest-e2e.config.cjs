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
  ],
  coverageReporters: ['text-summary', 'lcov', 'html'],
  coverageThreshold: {
    global: { lines: 55, statements: 55, branches: 40, functions: 55 },
  },
};
