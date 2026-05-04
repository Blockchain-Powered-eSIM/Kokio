import { importJWK, jwtVerify, decodeProtectedHeader } from 'jose';
import type { JWK, JWTVerifyResult, JWTPayload } from 'jose';
import { Config } from '@/appKeys';

// ─── Types ────────────────────────────────────────────────────────────────────

export type IdTokenClaims = {
  sub: string;
  auth_time?: number;
  email?: string;
  iat?: number;
  exp?: number;
  iss?: string;
  aud?: string | string[];
};

type JwksResponse = {
  keys: JWK[];
};

// ─── Cache ────────────────────────────────────────────────────────────────────

const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

type KeyCache = {
  keys: Map<string, CryptoKey>;
  fetchedAt: number;
};

let _cache: KeyCache | null = null;

function jwksUrl(): string {
  const base = Config.AUTH_SERVER_BASE_URL ?? '';
  return base.replace(/\/$/, '') + '/.well-known/jwks.json';
}

async function fetchKeys(): Promise<Map<string, CryptoKey>> {
  const res = await fetch(jwksUrl());
  if (!res.ok) throw new Error(`JWKS fetch failed: ${res.status}`);
  const { keys } = (await res.json()) as JwksResponse;

  const map = new Map<string, CryptoKey>();
  await Promise.all(
    keys.map(async (jwk) => {
      if (!jwk.kid) return;
      const key = await importJWK(jwk, jwk.alg ?? 'RS256');
      map.set(jwk.kid, key as CryptoKey);
    }),
  );
  return map;
}

async function getKey(kid: string): Promise<CryptoKey> {
  const now = Date.now();

  // Serve from cache if still fresh and kid is present.
  if (_cache && now - _cache.fetchedAt < CACHE_TTL_MS) {
    const key = _cache.keys.get(kid);
    if (key) return key;
  }

  // Re-fetch on cache miss or expiry (handles key rotation).
  const keys = await fetchKeys();
  _cache = { keys, fetchedAt: now };

  const key = keys.get(kid);
  if (!key) throw new Error(`Unknown kid: ${kid}`);
  return key;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Verifies an id_token signature against the server's JWKS.
 * JWKS is cached in-memory for 1 hour; a kid miss triggers an immediate
 * re-fetch to handle key rotation without a TTL wait.
 *
 * Returns typed claims on success; throws on invalid signature or expired token.
 */
export async function verifyIdToken(token: string): Promise<IdTokenClaims> {
  const header = decodeProtectedHeader(token);
  if (!header.kid) throw new Error('id_token missing kid header');

  const key = await getKey(header.kid);

  let result: JWTVerifyResult<JWTPayload>;
  try {
    result = await jwtVerify(token, key);
  } catch (err) {
    throw new Error(`id_token verification failed: ${(err as Error).message}`);
  }

  const p = result.payload;
  if (typeof p.sub !== 'string') throw new Error('id_token missing sub claim');

  return {
    sub: p.sub,
    auth_time: typeof p['auth_time'] === 'number' ? p['auth_time'] : undefined,
    email: typeof p['email'] === 'string' ? p['email'] : undefined,
    iat: typeof p.iat === 'number' ? p.iat : undefined,
    exp: typeof p.exp === 'number' ? p.exp : undefined,
    iss: typeof p.iss === 'string' ? p.iss : undefined,
    aud: p.aud,
  };
}

/** Clears the in-memory JWKS cache. Useful for testing. */
export function clearJwksCache(): void {
  _cache = null;
}
