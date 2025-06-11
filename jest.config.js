/** @type {import('jest').Config} */
export default {
  projects: [
    {
      displayName: 'unit',
      preset: 'ts-jest/presets/default-esm',
      extensionsToTreatAsEsm: ['.ts'],
      testEnvironment: 'node',
      rootDir: '.',
      testMatch: ['<rootDir>/tests/unit/**/*.test.ts'],
      collectCoverageFrom: [
        'src/**/*.ts',
        '!src/**/*.d.ts',
        '!src/types/**/*',
        '!dist/**/*'
      ],
      coverageDirectory: 'coverage',
      coverageReporters: ['text', 'lcov', 'html'],
      moduleNameMapper: {
        '^(\\.{1,2}/.*)\\.js$': '$1',
      },
      transform: {
        '^.+\\.ts$': ['ts-jest', {
          useESM: true,
          tsconfig: {
            module: 'esnext',
            moduleResolution: 'node'
          }
        }]
      },
      setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
      testTimeout: 10000
    },
    {
      displayName: 'integration',
      preset: 'ts-jest/presets/default-esm',
      extensionsToTreatAsEsm: ['.ts'],
      testEnvironment: 'node',
      rootDir: '.',
      testMatch: ['<rootDir>/tests/integration/**/*.test.ts'],
      moduleNameMapper: {
        '^(\\.{1,2}/.*)\\.js$': '$1',
      },
      transform: {
        '^.+\\.ts$': ['ts-jest', {
          useESM: true,
          tsconfig: {
            module: 'esnext',
            moduleResolution: 'node'
          }
        }]
      },
      setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
      testTimeout: 15000
    }
  ],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/types/**/*',
    '!dist/**/*'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html']
};