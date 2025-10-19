/** @type {import('jest').Config} */
module.exports = {
  rootDir: '.',
  testEnvironment: 'node',
  testMatch: ['**/test/**/*.e2e-spec.ts'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  transform: { '^.+\\.ts$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.spec.json', diagnostics: true }] },
  setupFiles: ['dotenv/config'],

  collectCoverage: true,
  coverageDirectory: '<rootDir>/coverage',
  coverageProvider: 'v8',
  collectCoverageFrom: [
    '<rootDir>/src/**/*.ts',
    '!<rootDir>/src/main.ts',
    '!<rootDir>/src/main.testing.ts',
    '!<rootDir>/src/app.module.ts',
    '!<rootDir>/src/**/*.module.ts',
    '!<rootDir>/src/**/migrations/**',
    '!<rootDir>/src/**/dto/**',
    '!<rootDir>/src/**/entities/**',
    '!<rootDir>/src/**/guards/**',
    '!<rootDir>/src/**/interceptors/**',
    '!<rootDir>/src/**/filters/**',
    '!<rootDir>/src/**/pipes/**'
  ],
  coverageReporters: ['text-summary', 'lcov', 'html'],
  coverageThreshold: { global: { lines: 60, statements: 60, branches: 43, functions: 60 } },
  maxWorkers: 1,

  // 👇 usa require.resolve para asegurar la ruta
  testSequencer: require.resolve('./test/jest-sequencer.cjs'),
};
