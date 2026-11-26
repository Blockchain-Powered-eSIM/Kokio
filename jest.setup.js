// AsyncStorage has no native module under Jest; use the in-memory mock it ships.
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

// The wallet SDK ships ESM-only dependencies; unit tests never construct it.
jest.mock('kokio-sdk', () => ({ Kokio: jest.fn() }));

// makeRedirectUri reads the Expo manifest, which does not exist under Jest.
jest.mock('expo-auth-session', () => ({
  ...jest.requireActual('expo-auth-session'),
  makeRedirectUri: jest.fn(() => 'kokio://callback'),
}));
