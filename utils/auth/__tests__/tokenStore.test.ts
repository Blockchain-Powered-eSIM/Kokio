/**
 * tokenStore unit tests
 *
 * expo-secure-store is replaced with a jest.fn() in-memory map so tests run
 * without a device. The module is re-required between suites via
 * jest.resetModules() so the SecureStore mock always starts empty.
 */

// ─── Mock expo-secure-store ───────────────────────────────────────────────────

const mockStore: Record<string, string> = {};

jest.mock('expo-secure-store', () => ({
  setItemAsync: jest.fn(async (key: string, value: string) => { mockStore[key] = value; }),
  getItemAsync: jest.fn(async (key: string) => mockStore[key] ?? null),
  deleteItemAsync: jest.fn(async (key: string) => { delete mockStore[key]; }),
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────

// A real base64url-encoded JWT with sub + auth_time — no valid signature, but
// decodeJwt() only needs the header and payload segments.
const MOCK_ID_TOKEN =
  'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9' +
  '.eyJzdWIiOiJ1c2VyLTEyMyIsImF1dGhfdGltZSI6MTcwMDAwMDAwMCwiaWF0IjoxNzAwMDAwMDAwLCJleHAiOjk5OTk5OTk5OTl9' +
  '.fakesig';

const MOCK_BUNDLE = {
  access_token: 'at-test',
  refresh_token: 'rt-test',
  id_token: MOCK_ID_TOKEN,
  expires_at: 9_999_999_999_000,
  auth_time: 1_700_000_000,
};

function freshModule() {
  jest.resetModules();
  jest.mock('expo-secure-store', () => ({
    setItemAsync: jest.fn(async (key: string, value: string) => { mockStore[key] = value; }),
    getItemAsync: jest.fn(async (key: string) => mockStore[key] ?? null),
    deleteItemAsync: jest.fn(async (key: string) => { delete mockStore[key]; }),
  }));
  return require('../tokenStore') as typeof import('../tokenStore');
}

beforeEach(() => {
  // Wipe the in-memory store before each test
  Object.keys(mockStore).forEach((k) => delete mockStore[k]);
});

// ─── Persistence round-trip ───────────────────────────────────────────────────

describe('saveTokens / loadTokens', () => {
  it('restores all five fields after a round-trip', async () => {
    const { saveTokens, loadTokens } = freshModule();
    await saveTokens(MOCK_BUNDLE);
    const restored = await loadTokens();
    expect(restored).toEqual(MOCK_BUNDLE);
  });

  it('stores everything in a single SecureStore key', async () => {
    const { saveTokens } = freshModule();
    const SecureStore = require('expo-secure-store');
    await saveTokens(MOCK_BUNDLE);
    expect(SecureStore.setItemAsync).toHaveBeenCalledTimes(1);
    expect(SecureStore.setItemAsync.mock.calls[0][0]).toBe('kokio.auth.tokens');
  });

  it('returns null when no tokens are stored', async () => {
    const { loadTokens } = freshModule();
    const result = await loadTokens();
    expect(result).toBeNull();
  });

  it('returns null and does not throw on corrupted blob', async () => {
    mockStore['kokio.auth.tokens'] = 'not-valid-json{{';
    const { loadTokens } = freshModule();
    await expect(loadTokens()).resolves.toBeNull();
  });
});

// ─── clearTokens ─────────────────────────────────────────────────────────────

describe('clearTokens', () => {
  it('leaves SecureStore empty after a save+clear cycle', async () => {
    const { saveTokens, loadTokens, clearTokens } = freshModule();
    await saveTokens(MOCK_BUNDLE);
    await clearTokens();
    const afterClear = await loadTokens();
    expect(afterClear).toBeNull();
    expect(mockStore['kokio.auth.tokens']).toBeUndefined();
  });

  it('issues exactly one deleteItemAsync call', async () => {
    // Require SecureStore AFTER freshModule() so we get the same mock instance
    // that tokenStore's clearTokens() will call.
    const { saveTokens, clearTokens } = freshModule();
    const SecureStore = require('expo-secure-store');
    await saveTokens(MOCK_BUNDLE);
    jest.clearAllMocks();
    await clearTokens();
    expect(SecureStore.deleteItemAsync).toHaveBeenCalledTimes(1);
    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('kokio.auth.tokens');
  });
});

// ─── parseIdToken ─────────────────────────────────────────────────────────────

describe('parseIdToken', () => {
  it('extracts sub from the id_token payload', () => {
    const { parseIdToken } = freshModule();
    const claims = parseIdToken(MOCK_ID_TOKEN);
    expect(claims.sub).toBe('user-123');
  });

  it('extracts auth_time from the id_token payload', () => {
    const { parseIdToken } = freshModule();
    const claims = parseIdToken(MOCK_ID_TOKEN);
    expect(claims.auth_time).toBe(1_700_000_000);
  });

  it('returns empty object for a malformed token', () => {
    const { parseIdToken } = freshModule();
    expect(parseIdToken('not.a.jwt')).toEqual({});
  });

  it('returns empty object for a completely invalid string', () => {
    const { parseIdToken } = freshModule();
    expect(parseIdToken('garbage')).toEqual({});
  });

  it('omits sub when claim is missing', () => {
    const { parseIdToken } = freshModule();
    // Craft a token without sub
    const payload = Buffer.from(JSON.stringify({ auth_time: 1700 })).toString('base64url');
    const token = `eyJhbGciOiJSUzI1NiJ9.${payload}.sig`;
    const claims = parseIdToken(token);
    expect(claims.sub).toBeUndefined();
    expect(claims.auth_time).toBe(1700);
  });
});
