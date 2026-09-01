// Mock expo-secure-store for testing
jest.mock('expo-secure-store', () => {
  const store = {};
  return {
    getItemAsync: jest.fn((key) => Promise.resolve(store[key] || null)),
    setItemAsync: jest.fn((key, value) => {
      store[key] = value;
      return Promise.resolve();
    }),
    deleteItemAsync: jest.fn((key) => {
      delete store[key];
      return Promise.resolve();
    }),
    __resetStore: () => {
      Object.keys(store).forEach((key) => delete store[key]);
    },
  };
});

// Mock expo-font for testing (design system uses Nunito Sans)
jest.mock('expo-font', () => ({
  useFonts: jest.fn(() => [true, null]),
  isLoaded: jest.fn(() => true),
  loadAsync: jest.fn(() => Promise.resolve()),
}));

// Mock expo-modules-core to avoid native module invariant errors
jest.mock('expo-modules-core', () => ({
  NativeModulesProxy: new Proxy({}, { get: () => jest.fn() }),
  requireNativeModule: jest.fn(() => ({})),
  requireOptionalNativeModule: jest.fn(() => null),
  EventEmitter: jest.fn(() => ({ addListener: jest.fn(), removeListeners: jest.fn() })),
  Platform: { OS: 'ios' },
}));

// Mock @expo-google-fonts/nunito-sans
jest.mock('@expo-google-fonts/nunito-sans', () => ({
  NunitoSans_400Regular: 'NunitoSans_400Regular',
  NunitoSans_500Medium: 'NunitoSans_500Medium',
  NunitoSans_600SemiBold: 'NunitoSans_600SemiBold',
  NunitoSans_700Bold: 'NunitoSans_700Bold',
}));

// Mock @hugeicons packages
jest.mock('@hugeicons/react-native', () => ({
  HugeiconsIcon: 'HugeiconsIcon',
}));

jest.mock('@hugeicons/core-free-icons', () => new Proxy({}, {
  get: (_, name) => name,
}));
