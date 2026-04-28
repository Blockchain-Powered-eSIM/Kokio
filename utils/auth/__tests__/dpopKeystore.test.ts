/**
 * dpopKeystore unit tests
 *
 * Three scenarios per acceptance criteria:
 *   1. Two calls in one session return identical jkt (memoization)
 *   2. Second app launch (module reset, SecureStore intact) returns same jkt
 *   3. clearDpopKeyPair() wipes SecureStore → next call generates a new jkt
 *
 * Native deps mocked:
 *   - expo-secure-store → in-memory map (mockStore, survives module resets via closure)
 *   - jose             → deterministic stubs keyed by a shared counter (mockKeyCount)
 */

// ─── Shared mock state ────────────────────────────────────────────────────────
// Names must start with "mock" so babel-jest's jest.mock hoisting doesn't
// throw a "used before declaration" error.

const mockStore: Record<string, string> = {};

const mockKeyCount = { value: 0 };

// ─── expo-secure-store mock ──────────────────────────────────────────────────

jest.mock('expo-secure-store', () => ({
  getItemAsync:    jest.fn((key: string)                => Promise.resolve(mockStore[key] ?? null)),
  setItemAsync:    jest.fn((key: string, val: string)   => { mockStore[key] = val; return Promise.resolve(); }),
  deleteItemAsync: jest.fn((key: string)                => { delete mockStore[key]; return Promise.resolve(); }),
}));

// ─── jose mock ───────────────────────────────────────────────────────────────
// generateKeyPair bumps the shared counter each call so keys are distinguishable.
// calculateJwkThumbprint is deterministic on the x-coordinate so the same JWK
// always hashes to the same jkt string regardless of whether it came from
// generateKeyPair or was loaded from SecureStore.

jest.mock('jose', () => ({
  generateKeyPair: jest.fn(async () => {
    mockKeyCount.value += 1;
    const n = String(mockKeyCount.value);
    return {
      privateKey: { _tag: 'private', _n: n } as unknown as CryptoKey,
      publicKey:  { _tag: 'public',  _n: n } as unknown as CryptoKey,
    };
  }),

  exportJWK: jest.fn(async (key: { _tag: string; _n: string }) =>
    key._tag === 'private'
      ? { kty: 'EC', crv: 'P-256', d: `d${key._n}`, x: `x${key._n}`, y: `y${key._n}` }
      : { kty: 'EC', crv: 'P-256',                   x: `x${key._n}`, y: `y${key._n}` }
  ),

  // Accepts both a raw JWK object (from SecureStore load) and a mock CryptoKey.
  importJWK: jest.fn(async (jwk: { x?: string; d?: string; _n?: string }) => ({
    _tag: jwk.d ? 'private' : 'public',
    // Recover _n from x-coordinate string ("x3" → "3") or from an already-mock key.
    _n: jwk._n ?? (jwk.x ? jwk.x.slice(1) : '?'),
  } as unknown as CryptoKey)),

  // Deterministic: "x3" → "jkt-3".  Works on both JWK objects and mock CryptoKeys.
  calculateJwkThumbprint: jest.fn(async (jwkOrKey: { x?: string; _n?: string }) => {
    const n = jwkOrKey.x ? jwkOrKey.x.slice(1) : (jwkOrKey._n ?? '?');
    return `jkt-${n}`;
  }),
}));

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Require a fresh module instance (simulates a new app process). */
function freshModule() {
  return require('../dpopKeystore') as typeof import('../dpopKeystore');
}

// ─── Setup / teardown ────────────────────────────────────────────────────────

beforeEach(() => {
  // Wipe the in-memory SecureStore and key counter between tests.
  Object.keys(mockStore).forEach((k) => delete mockStore[k]);
  mockKeyCount.value = 0;
  // Reset module registry so each test starts with _memo = null.
  jest.resetModules();
});

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('getDpopKeyPair', () => {
  it('returns the identical object on two calls within the same session (memo)', async () => {
    const { getDpopKeyPair } = freshModule();

    const first  = await getDpopKeyPair();
    const second = await getDpopKeyPair();

    // Strict reference equality proves the memo path was taken on the second call.
    expect(second).toBe(first);
    expect(second.jkt).toBe(first.jkt);
  });

  it('generates the key only once per session even on concurrent calls', async () => {
    const { getDpopKeyPair } = freshModule();
    const jose = require('jose');

    await Promise.all([getDpopKeyPair(), getDpopKeyPair(), getDpopKeyPair()]);

    expect(jose.generateKeyPair).toHaveBeenCalledTimes(1);
  });

  it('persists the key pair to SecureStore on first call', async () => {
    const { getDpopKeyPair } = freshModule();
    const SecureStore = require('expo-secure-store');

    await getDpopKeyPair();

    expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
      'kokio.dpop.privateKey',
      expect.stringContaining('"kty"')
    );
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
      'kokio.dpop.publicKey',
      expect.stringContaining('"kty"')
    );
  });
});

describe('second launch — same jkt', () => {
  it('restores the same jkt from SecureStore after a module reset', async () => {
    // ── First launch ──────────────────────────────────────────────────────────
    const { jkt: jkt1 } = await freshModule().getDpopKeyPair();

    // ── Simulate new process: module cache cleared, SecureStore intact ─────────
    jest.resetModules();
    const { jkt: jkt2 } = await freshModule().getDpopKeyPair();

    expect(jkt2).toBe(jkt1);
  });

  it('does NOT call generateKeyPair on the second launch', async () => {
    await freshModule().getDpopKeyPair();

    jest.resetModules();
    const jose = require('jose');
    await freshModule().getDpopKeyPair();

    // generateKeyPair must not have been called again after the reset.
    expect(jose.generateKeyPair).not.toHaveBeenCalled();
  });
});

describe('clearDpopKeyPair', () => {
  it('causes the next call to generate a fresh keypair with a different jkt', async () => {
    const mod = freshModule();

    const { jkt: jkt1 } = await mod.getDpopKeyPair();
    await mod.clearDpopKeyPair();
    const { jkt: jkt2 } = await mod.getDpopKeyPair();

    expect(jkt2).not.toBe(jkt1);
  });

  it('removes both keys from SecureStore', async () => {
    const mod = freshModule();
    const SecureStore = require('expo-secure-store');

    await mod.getDpopKeyPair();
    await mod.clearDpopKeyPair();

    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('kokio.dpop.privateKey');
    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('kokio.dpop.publicKey');
    expect(mockStore['kokio.dpop.privateKey']).toBeUndefined();
    expect(mockStore['kokio.dpop.publicKey']).toBeUndefined();
  });

  it('clearing and re-clearing is idempotent', async () => {
    const mod = freshModule();

    await mod.getDpopKeyPair();
    await mod.clearDpopKeyPair();
    await expect(mod.clearDpopKeyPair()).resolves.toBeUndefined();
  });
});
