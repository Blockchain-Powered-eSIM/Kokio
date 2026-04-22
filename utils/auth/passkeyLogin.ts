import { Passkey } from 'react-native-passkey';
import { v4 as uuidv4 } from 'uuid';
import { kokioAuthClient } from './kokioAuthClient';
import { buildDpopProof } from './dpopProof';
import { parseIdToken } from './tokenStore';
import { newPkcePair } from './pkce';
import { useAuthStore } from '@/stores/authStore';
import { Config } from '@/appKeys';

// ─── Authorize step ───────────────────────────────────────────────────────────
// GET /v1/auth/authorize returns a 302 to kokio://callback?code=<code>.
// We request with redirect:'manual' and extract the code from Location.

async function authorizeAndGetCode(params: {
  codeChallenge: string;
  deviceWalletAddress: string;
  authTime: number;
}): Promise<string> {
  const base = Config.AUTH_SERVER_BASE_URL;
  if (!base) throw new Error('AUTH_SERVER_BASE_URL is not configured');

  const redirectUri = Config.REDIRECT_URI ?? 'kokio://callback';
  const qs = new URLSearchParams({
    response_type: 'code',
    redirect_uri: redirectUri,
    code_challenge: params.codeChallenge,
    code_challenge_method: 'S256',
    device_wallet_address: params.deviceWalletAddress,
    auth_time: String(params.authTime),
  }).toString();

  const res = await fetch(`${base}/v1/auth/authorize?${qs}`, {
    method: 'GET',
    headers: { 'x-correlation-id': uuidv4() },
    redirect: 'manual',
  });

  // Prefer Location header (set on genuine 302); fall back to res.url for RN
  // fetch implementations that surface the redirect target there instead.
  const rawTarget =
    res.headers.get('location') ??
    res.headers.get('Location') ??
    ((res as unknown as { url?: string }).url ?? '');

  if (!rawTarget) {
    throw new Error(`Authorize: no redirect target (status ${res.status})`);
  }

  const code = new URL(rawTarget).searchParams.get('code');
  if (!code) throw new Error('Authorize: no code in redirect URL');
  return code;
}

// ─── Internal error helper ────────────────────────────────────────────────────

type ApiBody<T> = { success?: boolean; code?: string; message?: string; data?: T };

function assertData<T>(raw: unknown, label: string): T {
  const body = raw as ApiBody<T>;
  if (!body.data) throw new Error(`${label}: ${body.message ?? 'no data returned'}`);
  return body.data;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Full Kokio passkey login ceremony:
 * login/begin → Passkey.get → login/complete → PKCE authorize → token
 *
 * On success the token bundle is persisted in authStore and isAuthenticated
 * is set to true. Throws on any ceremony or network failure.
 */
export async function loginWithKokioPasskey(deviceWalletAddress: string): Promise<void> {
  // Generate PKCE pair before login/begin so codeVerifier is available
  // at token exchange without requiring an additional network round-trip.
  const { verifier: codeVerifier, challenge: codeChallenge } = await newPkcePair();

  // 1. Login begin — server generates and stores a WebAuthn challenge
  const beginData = assertData<{
    challenge: string;
    timeout: number;
    rpId: string;
    allowCredentials: { id: string; type: 'public-key'; transports?: string[] }[];
    userVerification: 'required';
  }>(
    await kokioAuthClient.loginBegin({ deviceWalletAddress }),
    'Login begin',
  );

  // 2. Native passkey assertion ceremony
  const assertion = await Passkey.get({
    challenge: beginData.challenge,
    rpId: beginData.rpId,
    timeout: beginData.timeout,
    allowCredentials: beginData.allowCredentials as { id: string; type: string }[],
    userVerification: beginData.userVerification,
  });

  // 3. Login complete — server verifies assertion, returns authTime
  const completeData = assertData<{ deviceWalletAddress: string; authTime: number }>(
    await kokioAuthClient.loginComplete({
      assertionResponse: {
        id: assertion.id,
        rawId: assertion.rawId,
        response: {
          clientDataJSON: assertion.response.clientDataJSON,
          authenticatorData: assertion.response.authenticatorData,
          signature: assertion.response.signature,
          userHandle: assertion.response.userHandle ?? null,
        },
        type: 'public-key',
        clientExtensionResults: {},
      },
    }),
    'Login complete',
  );

  // 4. PKCE authorize → single-use authorization code
  const code = await authorizeAndGetCode({
    codeChallenge,
    deviceWalletAddress,
    authTime: completeData.authTime,
  });

  // 5. Token exchange — DPoP-bound authorization_code grant
  const redirectUri = Config.REDIRECT_URI ?? 'kokio://callback';
  const tokenData = assertData<{
    access_token: string;
    refresh_token: string;
    id_token: string;
    expires_in: number;
  }>(
    await kokioAuthClient.token(
      { grant_type: 'authorization_code', code, redirect_uri: redirectUri, code_verifier: codeVerifier },
      (nonce) => buildDpopProof({
        htu: `${Config.AUTH_SERVER_BASE_URL}/v1/auth/token`,
        htm: 'POST',
        nonce,
      }),
    ),
    'Token exchange',
  );

  // 6. Persist token bundle — also sets isAuthenticated: true in authStore
  const { auth_time } = parseIdToken(tokenData.id_token);
  await useAuthStore.getState().setTokens({
    access_token:  tokenData.access_token,
    refresh_token: tokenData.refresh_token,
    id_token:      tokenData.id_token,
    expires_at:    Date.now() + tokenData.expires_in * 1000,
    auth_time:     auth_time ?? 0,
  });
}
