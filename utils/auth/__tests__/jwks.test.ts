/**
 * jwks unit tests
 *
 * Uses real jose (RS256 keys) to produce signed id_tokens, then verifies
 * that verifyIdToken returns the correct typed claims and that the JWKS cache
 * re-fetches on kid rotation.
 */

import {
  generateKeyPair,
  exportJWK,
  SignJWT,
  type JWK,
} from 'jose';
import { verifyIdToken, clearJwksCache } from '../jwks';

// ─── Mock fetch ───────────────────────────────────────────────────────────────

const mockFetch = jest.fn();
global.fetch = mockFetch;

// ─── Mock Config ──────────────────────────────────────────────────────────────

jest.mock('@/appKeys', () => ({
  Config: { AUTH_SERVER_BASE_URL: 'https://auth.kokio.app' },
}));

// ─── Key factory ─────────────────────────────────────────────────────────────

type KeyFixture = {
  privateKey: CryptoKey;
  publicJwk: JWK;
  kid: string;
};

async function makeKey(kid: string): Promise<KeyFixture> {
  const { privateKey, publicKey } = await generateKeyPair('RS256', { extractable: true });
  const publicJwk = { ...(await exportJWK(publicKey)), kid, alg: 'RS256' };
  return { privateKey: privateKey as CryptoKey, publicJwk, kid };
}

function jwksResponse(fixtures: KeyFixture[]): Response {
  return {
    ok: true,
    json: async () => ({ keys: fixtures.map((f) => f.publicJwk) }),
  } as unknown as Response;
}

async function makeIdToken(
  fixture: KeyFixture,
  overrides: Record<string, unknown> = {},
): Promise<string> {
  const base = {
    sub: 'user-123',
    auth_time: 1700000000,
    email: 'test@kokio.app',
  };
  return new SignJWT({ ...base, ...overrides })
    .setProtectedHeader({ alg: 'RS256', kid: fixture.kid })
    .setIssuedAt()
    .setExpirationTime('1h')
    .setIssuer('https://auth.kokio.app')
    .setAudience('kokio-app')
    .sign(fixture.privateKey);
}

// ─── Tests ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  clearJwksCache();
  mockFetch.mockReset();
});

describe('verifyIdToken — happy path', () => {
  it('returns typed claims for a valid token', async () => {
    const key = await makeKey('key-1');
    mockFetch.mockResolvedValueOnce(jwksResponse([key]));

    const token = await makeIdToken(key);
    const claims = await verifyIdToken(token);

    expect(claims.sub).toBe('user-123');
    expect(claims.auth_time).toBe(1700000000);
    expect(claims.email).toBe('test@kokio.app');
    expect(typeof claims.iat).toBe('number');
    expect(typeof claims.exp).toBe('number');
  });

  it('fetches JWKS only once when kid is cached', async () => {
    const key = await makeKey('key-1');
    mockFetch.mockResolvedValue(jwksResponse([key]));

    const token = await makeIdToken(key);
    await verifyIdToken(token);
    await verifyIdToken(token);

    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('omits email when not in token', async () => {
    const key = await makeKey('key-1');
    mockFetch.mockResolvedValueOnce(jwksResponse([key]));

    const token = await new SignJWT({ sub: 'user-456', auth_time: 1700000001 })
      .setProtectedHeader({ alg: 'RS256', kid: key.kid })
      .setIssuedAt()
      .setExpirationTime('1h')
      .sign(key.privateKey);

    const claims = await verifyIdToken(token);
    expect(claims.sub).toBe('user-456');
    expect(claims.email).toBeUndefined();
  });
});

describe('verifyIdToken — kid rotation', () => {
  it('re-fetches JWKS when kid is unknown (key rotation)', async () => {
    const key1 = await makeKey('key-1');
    const key2 = await makeKey('key-2');

    // First call: JWKS has only key-1
    mockFetch.mockResolvedValueOnce(jwksResponse([key1]));
    const token1 = await makeIdToken(key1);
    await verifyIdToken(token1);
    expect(mockFetch).toHaveBeenCalledTimes(1);

    // Second call: token signed with key-2, not in cache → re-fetch
    mockFetch.mockResolvedValueOnce(jwksResponse([key1, key2]));
    const token2 = await makeIdToken(key2);
    const claims = await verifyIdToken(token2);

    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(claims.sub).toBe('user-123');
  });
});

describe('verifyIdToken — errors', () => {
  it('throws when token is signed with an unknown key after re-fetch', async () => {
    const key1 = await makeKey('key-1');
    const key2 = await makeKey('key-2');

    mockFetch.mockResolvedValue(jwksResponse([key1]));
    const token = await makeIdToken(key2); // signed with key2, server only has key1

    await expect(verifyIdToken(token)).rejects.toThrow('Unknown kid: key-2');
  });

  it('throws when signature is invalid', async () => {
    const key1 = await makeKey('key-1');
    const key2 = await makeKey('key-2');

    // JWKS returns key1's public key, but token is signed with key2 under the same kid
    const impostor: KeyFixture = { ...key2, publicJwk: { ...key1.publicJwk, kid: 'key-x' }, kid: 'key-x' };
    mockFetch.mockResolvedValueOnce(jwksResponse([impostor]));

    const forgedToken = await new SignJWT({ sub: 'attacker' })
      .setProtectedHeader({ alg: 'RS256', kid: 'key-x' })
      .setIssuedAt()
      .setExpirationTime('1h')
      .sign(key2.privateKey); // wrong private key for key-x's public

    await expect(verifyIdToken(forgedToken)).rejects.toThrow(/verification failed/);
  });

  it('throws when token is missing kid header', async () => {
    const key = await makeKey('key-1');
    mockFetch.mockResolvedValueOnce(jwksResponse([key]));

    const token = await new SignJWT({ sub: 'user-1' })
      .setProtectedHeader({ alg: 'RS256' }) // no kid
      .setIssuedAt()
      .setExpirationTime('1h')
      .sign(key.privateKey);

    await expect(verifyIdToken(token)).rejects.toThrow('missing kid');
  });

  it('throws when JWKS endpoint is unavailable', async () => {
    const key = await makeKey('key-1');
    mockFetch.mockResolvedValueOnce({ ok: false, status: 503 } as Response);

    const token = await makeIdToken(key);
    await expect(verifyIdToken(token)).rejects.toThrow('JWKS fetch failed: 503');
  });
});
