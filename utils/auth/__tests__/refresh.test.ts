/**
 * refreshAccessToken unit tests
 *
 * Verifies token rotation, invalid_grant handling, concurrent deduplication,
 * and the absence of the `ath` claim on the DPoP proof (RFC 9449 §4.2).
 *
 * All I/O (kokioAuthClient, buildDpopProof, authStore) is replaced with
 * jest.fn() doubles. The module is re-required via freshModule() between
 * tests so the module-level _inFlight mutex always starts null.
 */

// ─── Shared mutable mock state ────────────────────────────────────────────────
// Defined outside freshModule() so the mock factories can close over them and
// tests can mutate the initial token bundle between calls.

import type { TokenBundle } from '../tokenStore';

const MOCK_ID_TOKEN =
  'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9' +
  '.eyJzdWIiOiJ1c2VyLTEyMyIsImF1dGhfdGltZSI6MTcwMDAwMDAwMCwiaWF0IjoxNzAwMDAwMDAwLCJleHAiOjk5OTk5OTk5OTl9' +
  '.fakesig';

const mockStore: { tokens: TokenBundle | null } = { tokens: null };
const mockSetTokens  = jest.fn(async (b: TokenBundle) => { mockStore.tokens = b; });
const mockClearTokens = jest.fn(async () => { mockStore.tokens = null; });
const mockToken      = jest.fn<Promise<unknown>, [unknown, unknown]>();
const mockBuildDpopProof = jest.fn(async (_params: unknown) => 'mock-proof');

function makeBundle(n: number | string = 0): TokenBundle {
  return {
    access_token:  `at-${n}`,
    refresh_token: `rt-${n}`,
    id_token:      MOCK_ID_TOKEN,
    expires_at:    Date.now() + 900_000,
    auth_time:     1_700_000_000,
  };
}

function successResp(n: number | string) {
  return {
    success: true,
    data: {
      access_token:  `at-${n}`,
      refresh_token: `rt-${n}`,
      id_token:      MOCK_ID_TOKEN,
      expires_in:    900,
    },
  };
}

function invalidGrantResp() {
  return { success: false, code: 'INVALID_GRANT' };
}

// ─── Fresh module helper ──────────────────────────────────────────────────────

function freshModule() {
  jest.resetModules();

  jest.mock('@/appKeys', () => ({
    Config: { AUTH_SERVER_BASE_URL: 'https://auth.example.com' },
  }));

  jest.mock('../kokioAuthClient', () => ({
    kokioAuthClient: { token: mockToken },
    DpopNonceError: class DpopNonceError extends Error { code = 'DPOP_NONCE_ERROR'; },
  }));

  jest.mock('../dpopProof', () => ({
    buildDpopProof: mockBuildDpopProof,
  }));

  jest.mock('@/stores/authStore', () => ({
    useAuthStore: {
      getState: () => ({
        get tokens() { return mockStore.tokens; },
        setTokens:   mockSetTokens,
        clearTokens: mockClearTokens,
      }),
    },
  }));

  return require('../refresh') as typeof import('../refresh');
}

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  mockStore.tokens = makeBundle(0); // initial bundle: at-0 / rt-0
  jest.clearAllMocks();
  mockSetTokens.mockImplementation(async (b: TokenBundle) => { mockStore.tokens = b; });
  mockClearTokens.mockImplementation(async () => { mockStore.tokens = null; });
  mockBuildDpopProof.mockResolvedValue('mock-proof');
});

// ─── Token rotation ───────────────────────────────────────────────────────────

describe('token rotation', () => {
  it('returns the new token bundle on a successful refresh', async () => {
    const { refreshAccessToken } = freshModule();
    mockToken.mockResolvedValue(successResp(1));

    const bundle = await refreshAccessToken();

    expect(bundle.access_token).toBe('at-1');
    expect(bundle.refresh_token).toBe('rt-1');
  });

  it('stores the new bundle before resolving', async () => {
    const { refreshAccessToken } = freshModule();
    mockToken.mockResolvedValue(successResp(1));

    await refreshAccessToken();

    expect(mockSetTokens).toHaveBeenCalledTimes(1);
    expect(mockSetTokens).toHaveBeenCalledWith(expect.objectContaining({
      access_token: 'at-1',
      refresh_token: 'rt-1',
    }));
    expect(mockStore.tokens?.refresh_token).toBe('rt-1');
  });

  it('rotates 20 times in sequence, each using the RT from the previous response', async () => {
    const { refreshAccessToken } = freshModule();

    // Each call returns at-N / rt-N where N increments
    let callIndex = 0;
    mockToken.mockImplementation(async () => successResp(++callIndex));

    for (let i = 0; i < 20; i++) {
      await refreshAccessToken();
    }

    expect(mockToken).toHaveBeenCalledTimes(20);
    expect(mockStore.tokens?.refresh_token).toBe('rt-20');

    // Verify each call used the RT produced by the previous one
    for (let i = 0; i < 20; i++) {
      const params = (mockToken.mock.calls[i] as [{ refresh_token: string }, unknown])[0];
      expect(params.refresh_token).toBe(`rt-${i}`); // rt-0 → rt-1 → … → rt-19
    }
  });

  it('sends grant_type=refresh_token with the current stored RT', async () => {
    mockStore.tokens = makeBundle('abc');
    const { refreshAccessToken } = freshModule();
    mockToken.mockResolvedValue(successResp('xyz'));

    await refreshAccessToken();

    const [params] = mockToken.mock.calls[0] as [{ grant_type: string; refresh_token: string }, unknown][];
    expect(params.grant_type).toBe('refresh_token');
    expect(params.refresh_token).toBe('rt-abc');
  });

  it('computes expires_at from expires_in seconds relative to now', async () => {
    const { refreshAccessToken } = freshModule();
    const before = Date.now();
    mockToken.mockResolvedValue(successResp(1));

    const bundle = await refreshAccessToken();
    const after = Date.now();

    expect(bundle.expires_at).toBeGreaterThanOrEqual(before + 900_000);
    expect(bundle.expires_at).toBeLessThanOrEqual(after + 900_000);
  });
});

// ─── invalid_grant → family revocation ───────────────────────────────────────

describe('invalid_grant handling', () => {
  it('throws TokenFamilyRevokedError on invalid_grant', async () => {
    const { refreshAccessToken, TokenFamilyRevokedError } = freshModule();
    mockToken.mockResolvedValue(invalidGrantResp());

    await expect(refreshAccessToken()).rejects.toBeInstanceOf(TokenFamilyRevokedError);
  });

  it('clears the token store on invalid_grant before throwing', async () => {
    const { refreshAccessToken } = freshModule();
    mockToken.mockResolvedValue(invalidGrantResp());

    await expect(refreshAccessToken()).rejects.toThrow();

    expect(mockClearTokens).toHaveBeenCalledTimes(1);
    expect(mockStore.tokens).toBeNull();
  });

  it('thrown error has code TOKEN_FAMILY_REVOKED', async () => {
    const { refreshAccessToken } = freshModule();
    mockToken.mockResolvedValue(invalidGrantResp());

    try {
      await refreshAccessToken();
      throw new Error('expected rejection');
    } catch (e) {
      expect((e as { code: string }).code).toBe('TOKEN_FAMILY_REVOKED');
    }
  });

  it('handles lowercase invalid_grant code', async () => {
    const { refreshAccessToken, TokenFamilyRevokedError } = freshModule();
    mockToken.mockResolvedValue({ success: false, code: 'invalid_grant' });

    await expect(refreshAccessToken()).rejects.toBeInstanceOf(TokenFamilyRevokedError);
    expect(mockClearTokens).toHaveBeenCalledTimes(1);
  });

  it('replay: second call with the same RT returns invalid_grant and clears tokens', async () => {
    const { refreshAccessToken, TokenFamilyRevokedError } = freshModule();

    // First call succeeds and rotates the RT
    mockToken.mockResolvedValueOnce(successResp(1));
    await refreshAccessToken();
    expect(mockStore.tokens?.refresh_token).toBe('rt-1');

    // Replay: pretend the old RT is replayed — server responds invalid_grant
    mockToken.mockResolvedValueOnce(invalidGrantResp());
    await expect(refreshAccessToken()).rejects.toBeInstanceOf(TokenFamilyRevokedError);
    expect(mockStore.tokens).toBeNull();
  });

  it('throws a generic error for other failure codes', async () => {
    const { refreshAccessToken, TokenFamilyRevokedError } = freshModule();
    mockToken.mockResolvedValue({ success: false, code: 'SERVER_ERROR' });

    await expect(refreshAccessToken()).rejects.not.toBeInstanceOf(TokenFamilyRevokedError);
    expect(mockClearTokens).not.toHaveBeenCalled();
  });
});

// ─── Concurrent deduplication ─────────────────────────────────────────────────

describe('mutex: concurrent refresh deduplication', () => {
  it('deduplicates three concurrent calls to a single server request', async () => {
    const { refreshAccessToken } = freshModule();
    mockToken.mockResolvedValue(successResp(1));

    const [a, b, c] = await Promise.all([
      refreshAccessToken(),
      refreshAccessToken(),
      refreshAccessToken(),
    ]);

    expect(mockToken).toHaveBeenCalledTimes(1);
    expect(a).toEqual(b);
    expect(b).toEqual(c);
  });

  it('stores the bundle exactly once even with concurrent callers', async () => {
    const { refreshAccessToken } = freshModule();
    mockToken.mockResolvedValue(successResp(1));

    await Promise.all([refreshAccessToken(), refreshAccessToken()]);

    expect(mockSetTokens).toHaveBeenCalledTimes(1);
  });

  it('second sequential call after the first resolves fires a new request', async () => {
    const { refreshAccessToken } = freshModule();
    mockToken
      .mockResolvedValueOnce(successResp(1))
      .mockResolvedValueOnce(successResp(2));

    await refreshAccessToken();
    await refreshAccessToken();

    expect(mockToken).toHaveBeenCalledTimes(2);
  });
});

// ─── DPoP proof — no ath claim ────────────────────────────────────────────────

describe('DPoP proof shape', () => {
  it('does not pass accessToken to buildDpopProof (no ath claim)', async () => {
    const { refreshAccessToken } = freshModule();

    // Make mockToken invoke the buildProof callback so buildDpopProof is called
    mockToken.mockImplementation(async (_params, buildProof) => {
      await (buildProof as (nonce?: string) => Promise<string>)(undefined);
      return successResp(1);
    });

    await refreshAccessToken();

    expect(mockBuildDpopProof).toHaveBeenCalledWith(
      expect.not.objectContaining({ accessToken: expect.anything() }),
    );
  });

  it('passes htu pointing to the /v1/auth/token endpoint', async () => {
    const { refreshAccessToken } = freshModule();

    mockToken.mockImplementation(async (_params, buildProof) => {
      await (buildProof as (nonce?: string) => Promise<string>)(undefined);
      return successResp(1);
    });

    await refreshAccessToken();

    expect(mockBuildDpopProof).toHaveBeenCalledWith(
      expect.objectContaining({ htu: 'https://auth.example.com/v1/auth/token' }),
    );
  });

  it('passes htm POST', async () => {
    const { refreshAccessToken } = freshModule();

    mockToken.mockImplementation(async (_params, buildProof) => {
      await (buildProof as (nonce?: string) => Promise<string>)();
      return successResp(1);
    });

    await refreshAccessToken();

    expect(mockBuildDpopProof).toHaveBeenCalledWith(
      expect.objectContaining({ htm: 'POST' }),
    );
  });

  it('forwards the server nonce when provided', async () => {
    const { refreshAccessToken } = freshModule();

    mockToken.mockImplementation(async (_params, buildProof) => {
      await (buildProof as (nonce?: string) => Promise<string>)('srv-nonce-1');
      return successResp(1);
    });

    await refreshAccessToken();

    expect(mockBuildDpopProof).toHaveBeenCalledWith(
      expect.objectContaining({ nonce: 'srv-nonce-1' }),
    );
  });
});

// ─── Guard: no tokens in store ────────────────────────────────────────────────

describe('no tokens in store', () => {
  it('throws TokenFamilyRevokedError when token store is empty', async () => {
    mockStore.tokens = null;
    const { refreshAccessToken, TokenFamilyRevokedError } = freshModule();

    await expect(refreshAccessToken()).rejects.toBeInstanceOf(TokenFamilyRevokedError);
    expect(mockToken).not.toHaveBeenCalled();
  });
});
