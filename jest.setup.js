// AsyncStorage has no native module under Jest; use the in-memory mock it ships.
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

// NetInfo has no native module under Jest either; use the mock it ships.
jest.mock('@react-native-community/netinfo', () =>
  require('@react-native-community/netinfo/jest/netinfo-mock'),
);

// The wallet SDK ships ESM-only dependencies; unit tests never construct it.
jest.mock('kokio-sdk', () => ({ Kokio: jest.fn() }));

// makeRedirectUri reads the Expo manifest, which does not exist under Jest.
jest.mock('expo-auth-session', () => ({
  ...jest.requireActual('expo-auth-session'),
  makeRedirectUri: jest.fn(() => 'kokio://callback'),
}));
