import { Passkey } from 'react-native-passkey';
import * as SecureStore from 'expo-secure-store';
import { v4 as uuidv4 } from 'uuid';
import { kokioAuthClient } from './kokioAuthClient';
import { buildDpopProof } from './dpopProof';
import { parseIdToken } from './tokenStore';
import { newPkcePair } from './pkce';
import { AuthError } from './errors';
import { useAuthStore } from '@/stores/authStore';
import { Config } from '@/appKeys';

// ─── Response envelope helper ─────────────────────────────────────────────────

type ApiBody<T> = { success?: boolean; code?: string; message?: string; data?: T };

function assertData<T>(raw: unknown, fallbackCode: string): T {
  const body = raw as ApiBody<T>;
  if (!body.data) {
    throw new AuthError(body.code ?? fallbackCode, undefined, body.message);
  }
  return body.data;
}

// ─── Authorize redirect interception ─────────────────────────────────────────
// GET /v1/auth/authorize → 302 kokio://callback?code=<code>
//
// RN behaviour:
//   iOS (URLSession): redirect: 'manual' → opaque response, status 0, res.url = redirect target
//   Android (OkHttp): redirect: 'manual' → 302 with Location header accessible
//
// TODO SPIKE: XHR-based fallback for environments where neither Location nor
// res.url is populated. Track in a prototype ticket before shipping to prod.

async function authorizeAndGetCode(params: {
  codeChallenge: string;
  deviceWalletAddress: string;
  authTime: number;
}): Promise<string> {
  const base = Config.AUTH_SERVER_BASE_URL;
  if (!base) throw new Error('AUTH_SERVER_BASE_URL is not configured');

  const redirectUri = Config.REDIRECT_URI ?? 'kokio://callback';
  const qs = new URLSearchParams({
    response_type:          'code',
    redirect_uri:           redirectUri,
    code_challenge:         params.codeChallenge,
    code_challenge_method:  'S256',
    device_wallet_address:  params.deviceWalletAddress,
    auth_time:              String(params.authTime),
  }).toString();

  const res = await fetch(`${base}/v1/auth/authorize?${qs}`, {
    method: 'GET',
    headers: { 'x-correlation-id': uuidv4() },
    redirect: 'manual',
  });

  // A genuine redirect has status 302 (Android) or 0 / type 'opaqueredirect' (iOS).
  const isRedirect =
    res.status === 302 ||
    res.status === 0 ||
    (res as unknown as { type?: string }).type === 'opaqueredirect';

  if (!isRedirect) {
    // Server returned an error — parse the body for a typed error code.
    let errCode = 'AUTHORIZE_FAILED';
    let errMsg: string | undefined;
    try {
      const body = (await res.json()) as { code?: string; message?: string };
      errCode = body.code ?? errCode;
      errMsg  = body.message;
    } catch {
      // Body unreadable; fall through to generic error.
    }
    throw new AuthError(errCode, res.status, errMsg);
  }

  const rawTarget =
    res.headers.get('location') ??
    res.headers.get('Location') ??
    ((res as unknown as { url?: string }).url ?? '');

  if (!rawTarget) {
    throw new AuthError('AUTHORIZE_FAILED', res.status, 'No redirect target in response');
  }

  const code = new URL(rawTarget).searchParams.get('code');
  if (!code) throw new AuthError('AUTHORIZE_FAILED', res.status, 'No code in redirect URL');
  return code;
}

// ─── Inner ceremony (retried on AUTH_TIME_RECENCY_VIOLATION) ──────────────────
// Steps: login/begin → Passkey.get → login/complete → authorize → code

async function performLoginCeremony(
  deviceWalletAddress: string,
  codeChallenge: string,
): Promise<string> {
  const beginData = assertData<{
    challenge: string;
    timeout: number;
    rpId: string;
    allowCredentials: { id: string; type: 'public-key'; transports?: string[] }[];
    userVerification: 'required';
  }>(
    await kokioAuthClient.loginBegin({ deviceWalletAddress }),
    'LOGIN_FAILED',
  );

  const assertion = await Passkey.get({
    challenge:          beginData.challenge,
    rpId:               beginData.rpId,
    timeout:            beginData.timeout,
    allowCredentials:   beginData.allowCredentials as { id: string; type: string }[],
    userVerification:   beginData.userVerification,
  });

  const completeData = assertData<{ deviceWalletAddress: string; authTime: number }>(
    await kokioAuthClient.loginComplete({
      assertionResponse: {
        id:      assertion.id,
        rawId:   assertion.rawId,
        response: {
          clientDataJSON:    assertion.response.clientDataJSON,
          authenticatorData: assertion.response.authenticatorData,
          signature:         assertion.response.signature,
          userHandle:        assertion.response.userHandle ?? null,
        },
        type:                   'public-key',
        clientExtensionResults: {},
      },
    }),
    'LOGIN_FAILED',
  );

  // authorize must be called immediately after login/complete; the server enforces
  // a 120-second recency window on authTime. If violated it throws AuthError with
  // code AUTH_TIME_RECENCY_VIOLATION, which the caller retries from here.
  return authorizeAndGetCode({
    codeChallenge,
    deviceWalletAddress,
    authTime: completeData.authTime,
  });
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Full Kokio passkey login ceremony:
 *   PKCE → login/begin → Passkey.get → login/complete → authorize → token
 *
 * `deviceWalletAddress` is optional. When omitted the address stored in
 * SecureStore from the registration ceremony is used (normal app-restart login).
 *
 * AUTH_TIME_RECENCY_VIOLATION (user spent >120s at the biometric prompt) is
 * retried once: a fresh login/begin challenge is fetched and the user is
 * prompted again, reusing the same PKCE pair.
 *
 * On success the token bundle is persisted and `isAuthenticated` is set to true.
 * Throws AuthError on any ceremony or network failure.
 */
export async function loginWithKokioPasskey(deviceWalletAddress?: string): Promise<void> {
  const address = deviceWalletAddress ?? await SecureStore.getItemAsync('deviceWalletAddress');
  if (!address) throw new AuthError('NO_DEVICE_WALLET');

  // PKCE pair lives in this closure for the lifetime of one login attempt.
  // The same pair is reused on AUTH_TIME_RECENCY_VIOLATION retry so the
  // verifier remains available for the eventual token exchange.
  const { verifier: codeVerifier, challenge: codeChallenge } = await newPkcePair();

  let code: string | undefined;

  for (let attempt = 0; attempt <= 1; attempt++) {
    try {
      code = await performLoginCeremony(address, codeChallenge);
      break;
    } catch (err) {
      if (
        err instanceof AuthError &&
        err.code === 'AUTH_TIME_RECENCY_VIOLATION' &&
        attempt === 0
      ) {
        continue; // retry: fresh challenge + new biometric prompt
      }
      throw err;
    }
  }

  const redirectUri = Config.REDIRECT_URI ?? 'kokio://callback';

  const tokenData = assertData<{
    access_token:  string;
    refresh_token: string;
    id_token:      string;
    expires_in:    number;
  }>(
    await kokioAuthClient.token(
      {
        grant_type:    'authorization_code',
        code:          code!,
        redirect_uri:  redirectUri,
        code_verifier: codeVerifier,
      },
      (nonce) => buildDpopProof({
        htu: `${Config.AUTH_SERVER_BASE_URL}/v1/auth/token`,
        htm: 'POST',
        nonce,
      }),
    ),
    'LOGIN_FAILED',
  );

  const { auth_time } = parseIdToken(tokenData.id_token);
  await useAuthStore.getState().setTokens({
    access_token:  tokenData.access_token,
    refresh_token: tokenData.refresh_token,
    id_token:      tokenData.id_token,
    expires_at:    Date.now() + tokenData.expires_in * 1000,
    auth_time:     auth_time ?? 0,
  });
}
