// Tests that need the Firebase emulators. Run with `npm run test:rules`,
// which starts the emulators first. Kept out of `npm test` so CI and deploys
// don't need Java or the emulators.
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/firebase-tests'],
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      tsconfig: { esModuleInterop: true, allowSyntheticDefaultImports: true, isolatedModules: true },
    }],
  },
  maxWorkers: 1,
  testTimeout: 30000,
};
