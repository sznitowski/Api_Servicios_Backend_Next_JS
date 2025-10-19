/** @type {import('jest').Config} */
module.exports = {
  rootDir: '.',
  testEnvironment: 'node',
  testMatch: ['**/test/**/*.e2e-spec.ts'],
  moduleFileExtensions: ['ts', 'js', 'json'],

  // ts-jest usando nuestro tsconfig para tests
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.jest.json', diagnostics: true }],
  },

  // Usamos el setup para cargar .env.test y timeouts
  setupFilesAfterEnv: ['<rootDir>/test/setup-e2e.ts'],

  // Opcional: si prefieres, podrías quitar dotenv de aquí si ya lo cargas en setup
  // setupFiles: ['dotenv/config'],

  // === Cobertura ===
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
  coverageThreshold: {
    global: { lines: 60, statements: 60, branches: 43, functions: 60 },
  },

  // Evitar saturar la PC
  maxWorkers: 1,
  verbose: true,
  testTimeout: 30000,
};
