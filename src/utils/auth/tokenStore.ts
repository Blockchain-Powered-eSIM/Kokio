import * as SecureStore from 'expo-secure-store';
import { decodeJwt } from 'jose';
import { AUTH_TOKENS_KEY } from '@/lib/storage/keys';

// ─── Types ────────────────────────────────────────────────────────────────────

export type TokenBundle = {
  access_token: string;
  refresh_token: string;
  id_token: string;
  /** Unix timestamp (ms) after which access_token should be treated as expired. */
  expires_at: number;
  /** Unix timestamp (s) of the original authentication event (from id_token). */
  auth_time: number;
};

export type IdTokenClaims = {
  sub?: string;
  auth_time?: number;
};

// ─── Storage key ─────────────────────────────────────────────────────────────
// Single JSON blob so all five fields are written atomically.

// ─── Persistence helpers ──────────────────────────────────────────────────────

export async function saveTokens(bundle: TokenBundle): Promise<void> {
  await SecureStore.setItemAsync(AUTH_TOKENS_KEY, JSON.stringify(bundle));
}

export async function loadTokens(): Promise<TokenBundle | null> {
  const raw = await SecureStore.getItemAsync(AUTH_TOKENS_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as TokenBundle;
  } catch {
    return null;
  }
}

export async function clearTokens(): Promise<void> {
  await SecureStore.deleteItemAsync(AUTH_TOKENS_KEY);
}

// ─── id_token claims ──────────────────────────────────────────────────────────
// Decodes the JWT payload without signature verification — for UI display only.

export function parseIdToken(idToken: string): IdTokenClaims {
  try {
    const claims = decodeJwt(idToken);
    return {
      sub: typeof claims.sub === 'string' ? claims.sub : undefined,
      auth_time: typeof claims.auth_time === 'number' ? claims.auth_time : undefined,
    };
  } catch {
    return {};
  }
}
