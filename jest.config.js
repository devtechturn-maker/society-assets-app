module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  testMatch: ['<rootDir>/tests/**/*.test.ts', '<rootDir>/tests/**/*.test.tsx'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    // npm installs expo-modules-core inside expo/; jest-expo's setup expects it at the top level.
    '^expo-modules-core$': '<rootDir>/node_modules/expo/node_modules/expo-modules-core',
    '^expo-modules-core/(.*)$': '<rootDir>/node_modules/expo/node_modules/expo-modules-core/$1',
  },
  collectCoverageFrom: [
    'src/utils/chatThreadHelpers.ts',
    'src/services/api.ts',
  ],
  testPathIgnorePatterns: ['/node_modules/', '/android/', '/ios/'],
  clearMocks: false,
};
