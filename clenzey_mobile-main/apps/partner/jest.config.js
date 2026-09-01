module.exports = {
  preset: 'jest-expo',
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|@hugeicons/.*|react-navigation|@react-navigation/.*|@sentry/react-native|native-base|react-native-svg|zustand)',
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@clenzey/types$': '<rootDir>/../../packages/types/src/index.ts',
    '^@clenzey/types/(.*)$': '<rootDir>/../../packages/types/src/$1',
    '^@clenzey/api-client$': '<rootDir>/../../packages/api-client/src/index.ts',
    '^@clenzey/api-client/(.*)$': '<rootDir>/../../packages/api-client/src/$1',
    '^@clenzey/design-system$': '<rootDir>/../../packages/design-system/src/index.ts',
    '^@clenzey/design-system/(.*)$': '<rootDir>/../../packages/design-system/src/$1',
  },
  setupFiles: ['<rootDir>/jest.setup.js'],
};
