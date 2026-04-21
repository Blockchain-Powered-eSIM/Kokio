import { Config } from '@/appKeys';
import { useAuthStore } from '@/stores/authStore';
import { buildDpopProof } from '@/utils/auth/dpopProof';
import { kokioAuthClient, type DpopProofBuilder } from '@/utils/auth/kokioAuthClient';
import { type TokenBundle, parseIdToken } from '@/utils/auth/tokenStore';

// ─── Token family revocation error ───────────────────────────────────────────
// Thrown when the server returns invalid_grant — the entire token family derived
// from the original authorization_code grant is dead and cannot be recovered.
// Callers MUST treat this as a signal to force full re-authentication.

export class TokenFamilyRevokedError extends Error {
  readonly code = 'TOKEN_FAMILY_REVOKED' as const;
  constructor() {
    super('Refresh token family revoked — re-authentication required');
    this.name = 'TokenFamilyRevokedError';
  }
}

// ─── Mutex ────────────────────────────────────────────────────────────────────
// All concurrent callers share one in-flight promise so exactly one token
// request is sent to the server regardless of how many requests race here.

let _inFlight: Promise<TokenBundle> | null = null;

export function refreshAccessToken(): Promise<TokenBundle> {
  if (_inFlight) return _inFlight;
  _inFlight = _doRefresh().finally(() => { _inFlight = null; });
  return _inFlight;
}

// ─── Implementation ───────────────────────────────────────────────────────────

async function _doRefresh(): Promise<TokenBundle> {
  const current = useAuthStore.getState().tokens;
  if (!current) {
    throw new TokenFamilyRevokedError();
  }

  const tokenUrl = `${Config.AUTH_SERVER_BASE_URL ?? ''}/v1/auth/token`;

  // No `accessToken` → no `ath` claim (RFC 9449 §4.2: ath is only present when
  // calling a protected resource with an existing AT, not during token issuance).
  const buildProof: DpopProofBuilder = (nonce) =>
    buildDpopProof({ htu: tokenUrl, htm: 'POST', nonce });

  // kokioAuthClient.token() handles DPoP nonce retry internally (AUTH-303).
  // Non-200 responses are returned as parsed JSON (not thrown), so we inspect
  // the response body to detect invalid_grant.
  const resp = await kokioAuthClient.token(
    { grant_type: 'refresh_token', refresh_token: current.refresh_token },
    buildProof,
  ) as {
    success: boolean;
    code?: string;
    data?: {
      access_token: string;
      refresh_token: string;
      id_token: string;
      expires_in: number;
    };
  };

  // invalid_grant → token family is dead (replay detected, server-side revocation,
  // or DPoP key mismatch). Clear immediately so no stale token escapes.
  if (!resp.success) {
    if (resp.code?.toLowerCase() === 'invalid_grant') {
      await useAuthStore.getState().clearTokens();
      throw new TokenFamilyRevokedError();
    }
    throw new Error(`Token refresh failed: ${resp.code ?? 'unknown error'}`);
  }

  if (!resp.data) throw new Error('Token refresh response missing data');

  const { access_token, refresh_token, id_token, expires_in } = resp.data;

  const bundle: TokenBundle = {
    access_token,
    refresh_token,
    id_token,
    expires_at: Date.now() + expires_in * 1_000,
    auth_time: parseIdToken(id_token).auth_time ?? Math.floor(Date.now() / 1_000),
  };

  // Atomic swap: new RT is persisted to SecureStore before this promise
  // resolves. The old RT is now consumed and must never be used again.
  await useAuthStore.getState().setTokens(bundle);

  return bundle;
}
