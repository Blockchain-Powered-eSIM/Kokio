import { Passkey } from 'react-native-passkey';
import * as AuthSession from 'expo-auth-session';
import { v4 as uuidv4 } from 'uuid';
import { kokioAuthClient } from './kokioAuthClient';
import { buildDpopProof } from './dpopProof';
import { parseIdToken } from './tokenStore';
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

// ─── OAuth redirect via universal link ───────────────────────────────────────

const REDIRECT_URI = AuthSession.makeRedirectUri({ native: Config.REDIRECT_URI });

// ─── Inner ceremony (retried on AUTH_TIME_RECENCY_VIOLATION) ──────────────────
// Steps: login/begin → Passkey.get → login/complete → authorize → { code, codeVerifier }
//
// AuthRequest owns the PKCE pair (usePKCE: true). codeVerifier is read from the
// request instance after promptAsync resolves and passed back to the caller for
// the token exchange.

async function performLoginCeremony(): Promise<{ code: string; codeVerifier: string }> {
  const base = Config.AUTH_SERVER_BASE_URL;
  if (!base) throw new Error('AUTH_SERVER_BASE_URL is not configured');

  const beginData = assertData<{
    challenge: string;
    timeout: number;
    rpId: string;
    allowCredentials: { id: string; type: 'public-key'; transports?: string[] }[];
    userVerification: 'required';
  }>(
    await kokioAuthClient.loginBegin(),
    'LOGIN_FAILED',
  );

  const assertion = await Passkey.get({
    challenge:         beginData.challenge,
    rpId:              beginData.rpId,
    timeout:           beginData.timeout,
    allowCredentials:  beginData.allowCredentials as { id: string; type: string }[],
    userVerification:  beginData.userVerification,
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
  const correlationId = uuidv4();
  const request = new AuthSession.AuthRequest({
    clientId:    'kokio-bff',
    redirectUri: REDIRECT_URI,
    usePKCE:     true,
    state: correlationId,
    extraParams: {
      device_wallet_address: completeData.deviceWalletAddress,
      auth_time: String(completeData.authTime),
    },
  });

  console.log("[REQUEST]" , request);

  if (__DEV__) {
    console.log(
      `[authFetch] GET /v1/auth/authorize\n req:`,
      { 'x-correlation-id': correlationId, device_wallet_address: completeData.deviceWalletAddress, auth_time: completeData.authTime },
    );
  }

  const result = await request.promptAsync({
    authorizationEndpoint: `${base}/v1/auth/authorize`,
  });

  if (__DEV__) {
    console.log(`[authFetch] GET /v1/auth/authorize → ${result.type}\n res:`, result.type === 'success' ? { code: result.params.code, state: result.params.state } : result);
  }

  if (result.type === 'success') {
    const { code } = result.params;
    if (!code) throw new AuthError('AUTHORIZE_FAILED', undefined, 'No code in redirect');
    return { code, codeVerifier: request.codeVerifier! };
  }

  if (result.type === 'error') {
    throw new AuthError('AUTHORIZE_FAILED', undefined, result.params.error);
  }

  // dismiss | cancel
  throw new AuthError('AUTHORIZE_FAILED', undefined, 'Authorization was dismissed');
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Full Kokio passkey login ceremony:
 *   login/begin → Passkey.get → login/complete → authorize (AuthSession) → token
 *
 * login/begin requires no body — the server issues a discoverable-credential
 * challenge and the authenticated deviceWalletAddress is derived from
 * login/complete. This supports recovery after app data clear or reinstall.
 *
 * AUTH_TIME_RECENCY_VIOLATION (user spent >120s at the biometric prompt) is
 * retried once: a fresh ceremony runs with a new PKCE pair, new passkey
 * assertion, and a new AuthSession prompt.
 *
 * On success the token bundle is persisted and `isAuthenticated` is set to true.
 * Throws AuthError on any ceremony or network failure.
 */
export async function loginWithKokioPasskey(): Promise<void> {
  let ceremony: { code: string; codeVerifier: string } | undefined;

  for (let attempt = 0; attempt <= 1; attempt++) {
    try {
      ceremony = await performLoginCeremony();
      break;
    } catch (err) {
      if (
        err instanceof AuthError &&
        err.code === 'AUTH_TIME_RECENCY_VIOLATION' &&
        attempt === 0
      ) {
        continue; // retry: fresh passkey challenge + new biometric prompt + new PKCE pair
      }
      throw err;
    }
  }

  const tokenData = assertData<{
    access_token:  string;
    refresh_token: string;
    id_token:      string;
    expires_in:    number;
  }>(
    await kokioAuthClient.token(
      {
        grant_type:    'authorization_code',
        code:          ceremony!.code,
        redirect_uri:  REDIRECT_URI,
        code_verifier: ceremony!.codeVerifier,
      },
      (nonce, htu) => buildDpopProof({ htu: htu!, htm: 'POST', nonce }),
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
