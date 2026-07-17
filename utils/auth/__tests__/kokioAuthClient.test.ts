/**
 * kokioAuthClient integration tests — DPoP nonce handling (RFC 9449 §8)
 *
 * fetch is replaced with a jest.fn() so we can simulate server-issued nonce
 * challenges without a real network. The module is reset between tests so the
 * per-origin nonce cache always starts empty.
 */

// ─── Mock @/appKeys so AUTH_SERVER_BASE_URL is available ─────────────────────

jest.mock('@/appKeys', () => ({
  Config: { AUTH_SERVER_BASE_URL: 'https://auth.example.com' },
}));

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeHeaders(map: Record<string, string>) {
  return {
    get: (key: string) => map[key.toLowerCase()] ?? null,
  };
}

function makeResponse(status: number, body: unknown, headers: Record<string, string> = {}) {
  return {
    status,
    ok: status >= 200 && status < 300,
    headers: makeHeaders(headers),
    json: () => Promise.resolve(body),
  } as unknown as Response;
}

const SUCCESS_BODY = { success: true, data: { access_token: 'at-abc' } };
const NONCE_CHALLENGE_BODY = { success: false, code: 'DPOP_PROOF_MISSING' };

function nonceChallenge(nonce: string) {
  return makeResponse(401, NONCE_CHALLENGE_BODY, {
    'www-authenticate': 'DPoP error="use_dpop_nonce"',
    'dpop-nonce': nonce,
  });
}

function success() {
  return makeResponse(200, SUCCESS_BODY);
}

/** Fresh module instance — resets the _nonceCache and interceptor slots. */
function freshClient() {
  jest.resetModules();
  // Re-apply the @/appKeys mock for the re-required module
  jest.mock('@/appKeys', () => ({
    Config: { AUTH_SERVER_BASE_URL: 'https://auth.example.com' },
  }));
  return require('../kokioAuthClient') as typeof import('../kokioAuthClient');
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('DPoP nonce: retry on use_dpop_nonce challenge', () => {
  it('retries once and succeeds when server issues a nonce on first attempt', async () => {
    const { kokioAuthClient } = freshClient();

    const mockFetch = jest.fn()
      .mockResolvedValueOnce(nonceChallenge('nonce-1'))
      .mockResolvedValueOnce(success());
    global.fetch = mockFetch;

    const noncesReceived: (string | undefined)[] = [];
    const buildProof = jest.fn(async (nonce?: string) => {
      noncesReceived.push(nonce);
      return `proof-${nonce ?? 'none'}`;
    });

    const result = await kokioAuthClient.token(
      { grant_type: 'authorization_code', code: 'c', redirect_uri: 'kokio://callback', code_verifier: 'v'.repeat(43) },
      buildProof,
    );

    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(buildProof).toHaveBeenCalledTimes(2);
    expect(noncesReceived[0]).toBeUndefined();   // first attempt: no cached nonce
    expect(noncesReceived[1]).toBe('nonce-1');   // retry: server nonce applied
    expect(result).toEqual(SUCCESS_BODY);
  });

  it('includes the nonce in the DPoP header on the retry request', async () => {
    const { kokioAuthClient } = freshClient();

    const mockFetch = jest.fn()
      .mockResolvedValueOnce(nonceChallenge('nonce-xyz'))
      .mockResolvedValueOnce(success());
    global.fetch = mockFetch;

    const buildProof = jest.fn(async (nonce?: string) => `proof-${nonce ?? 'none'}`);

    await kokioAuthClient.token(
      { grant_type: 'refresh_token', refresh_token: 'rt' },
      buildProof,
    );

    const retryHeaders = mockFetch.mock.calls[1][1]?.headers as Record<string, string>;
    expect(retryHeaders['DPoP']).toBe('proof-nonce-xyz');
  });
});

describe('DPoP nonce: two consecutive failures → DpopNonceError', () => {
  it('throws DpopNonceError after two consecutive nonce challenges', async () => {
    const { kokioAuthClient, DpopNonceError } = freshClient();

    global.fetch = jest.fn()
      .mockResolvedValueOnce(nonceChallenge('nonce-a'))
      .mockResolvedValueOnce(nonceChallenge('nonce-b'));

    const buildProof = jest.fn(async (nonce?: string) => `proof-${nonce ?? 'none'}`);

    await expect(
      kokioAuthClient.token({ grant_type: 'refresh_token', refresh_token: 'rt' }, buildProof),
    ).rejects.toBeInstanceOf(DpopNonceError);

    expect((global.fetch as jest.Mock)).toHaveBeenCalledTimes(2);
  });

  it('thrown error has code DPOP_NONCE_ERROR', async () => {
    const { kokioAuthClient } = freshClient();

    global.fetch = jest.fn()
      .mockResolvedValue(nonceChallenge('nonce-loop'));

    const buildProof = jest.fn(async (nonce?: string) => `proof-${nonce ?? 'none'}`);

    try {
      await kokioAuthClient.token({ grant_type: 'refresh_token', refresh_token: 'rt' }, buildProof);
      fail('expected DpopNonceError');
    } catch (e: unknown) {
      expect((e as { code: string }).code).toBe('DPOP_NONCE_ERROR');
    }
  });
});

describe('DPoP nonce: proactive caching', () => {
  it('includes nonce from a previous response on the next request to the same origin', async () => {
    const { kokioAuthClient } = freshClient();

    // First call succeeds and returns a nonce in the response
    global.fetch = jest.fn()
      .mockResolvedValueOnce(makeResponse(200, SUCCESS_BODY, { 'dpop-nonce': 'cached-nonce' }))
      .mockResolvedValueOnce(success());

    const noncesReceived: (string | undefined)[] = [];
    const buildProof = jest.fn(async (nonce?: string) => {
      noncesReceived.push(nonce);
      return `proof-${nonce ?? 'none'}`;
    });

    await kokioAuthClient.token({ grant_type: 'refresh_token', refresh_token: 'rt1' }, buildProof);
    await kokioAuthClient.token({ grant_type: 'refresh_token', refresh_token: 'rt2' }, buildProof);

    expect(noncesReceived[0]).toBeUndefined();      // first call: no cache yet
    expect(noncesReceived[1]).toBe('cached-nonce'); // second call: proactively uses cached nonce
  });

  it('clearNonceCache() removes cached nonces', async () => {
    const { kokioAuthClient, clearNonceCache } = freshClient();

    global.fetch = jest.fn()
      .mockResolvedValueOnce(makeResponse(200, SUCCESS_BODY, { 'dpop-nonce': 'stale' }))
      .mockResolvedValueOnce(success());

    const noncesReceived: (string | undefined)[] = [];
    const buildProof = jest.fn(async (nonce?: string) => {
      noncesReceived.push(nonce);
      return `proof-${nonce ?? 'none'}`;
    });

    await kokioAuthClient.token({ grant_type: 'refresh_token', refresh_token: 'rt1' }, buildProof);
    clearNonceCache();
    await kokioAuthClient.token({ grant_type: 'refresh_token', refresh_token: 'rt2' }, buildProof);

    expect(noncesReceived[0]).toBeUndefined(); // before first call: no cache
    expect(noncesReceived[1]).toBeUndefined(); // after clear: cache gone
  });
});

describe('DPoP nonce: non-nonce 401 does not trigger retry', () => {
  it('does not retry when 401 has no use_dpop_nonce in WWW-Authenticate', async () => {
    const { kokioAuthClient } = freshClient();

    const regularUnauthorized = makeResponse(401, { success: false, code: 'UNAUTHORIZED' }, {
      'www-authenticate': 'DPoP error="invalid_token"',
    });

    const mockFetch = jest.fn().mockResolvedValueOnce(regularUnauthorized);
    global.fetch = mockFetch;

    const buildProof = jest.fn(async () => 'proof');

    // Returns the 401 response body as-is (no retry, no throw)
    const result = await kokioAuthClient.token(
      { grant_type: 'refresh_token', refresh_token: 'rt' },
      buildProof,
    );

    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({ success: false, code: 'UNAUTHORIZED' });
  });

  it('does not retry nonce challenge on endpoints without a buildProof', async () => {
    const { kokioAuthClient } = freshClient();

    // loginBegin has no DPoP proof — a 401 from it should not trigger nonce retry
    const mockFetch = jest.fn().mockResolvedValueOnce(
      makeResponse(401, NONCE_CHALLENGE_BODY, {
        'www-authenticate': 'DPoP error="use_dpop_nonce"',
        'dpop-nonce': 'ignored',
      }),
    );
    global.fetch = mockFetch;

    await kokioAuthClient.loginBegin({ deviceWalletAddress: '0xDeviceWallet' });

    expect(mockFetch).toHaveBeenCalledTimes(1); // no retry
  });
});
