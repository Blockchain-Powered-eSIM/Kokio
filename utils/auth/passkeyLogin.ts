import { Passkey } from 'react-native-passkey';
import * as AuthSession from 'expo-auth-session';
import * as SecureStore from 'expo-secure-store';
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

async function performLoginCeremony(credentialIdHint?: string, deviceWalletAddressOverride?: string): Promise<{ code: string; codeVerifier: string }> {
  const base = Config.AUTH_SERVER_BASE_URL;
  if (!base) throw new Error('AUTH_SERVER_BASE_URL is not configured');

  const deviceWalletAddress = deviceWalletAddressOverride ?? await SecureStore.getItemAsync('deviceWalletAddress');
  if (!deviceWalletAddress) {
    throw new AuthError('CREDENTIAL_NOT_FOUND', undefined, 'No registered device found. Please register first.');
  }

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

  // const assertion = await Passkey.get({
  //   challenge:         beginData.challenge,
  //   rpId:              beginData.rpId,
  //   timeout:           beginData.timeout,
  //   allowCredentials:  beginData.allowCredentials as { id: string; type: string }[],
  //   userVerification:  beginData.userVerification,
  // });

  let assertion;
  try {
    console.log('[PASSKEY] calling Passkey.get');
    // On Android, empty allowCredentials triggers discoverable-credential discovery
    // via Google Password Manager, which hangs or shows "Use another device" when
    // the credential isn't yet locally indexed. Use the stored credential ID to
    // target the credential directly and skip the cloud enumeration entirely.
    const resolvedId = credentialIdHint ?? await SecureStore.getItemAsync('credentialId') ?? undefined;
    const allowCredentials = resolvedId
      ? [{ id: resolvedId, type: 'public-key' as const }]
      : beginData.allowCredentials as { id: string; type: string }[];

    assertion = await Passkey.get({
      challenge:        beginData.challenge,
      rpId:             beginData.rpId,
      timeout:          beginData.timeout,
      allowCredentials: allowCredentials,
      userVerification: beginData.userVerification,
    });
    console.log('[PASSKEY] got assertion');
  } catch (e) {
    console.log('[PASSKEY] error', e);
    throw e;
  }

  const completeData = assertData<{ deviceWalletAddress: string; authTime: number }>(
    await kokioAuthClient.loginComplete({
      assertionResponse: {
        id:      assertion.id,
        rawId:   assertion.rawId ?? assertion.id,
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

  const result = await request.promptAsync(
    { authorizationEndpoint: `${base}/v1/auth/authorize` },
    { preferUniversalLinks: true },
  );

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
 * login/begin requires the stored deviceWalletAddress to scope the challenge
 * to the device's credential. If no address is found in SecureStore (fresh
 * install / cleared data), CREDENTIAL_NOT_FOUND is thrown and the caller
 * should redirect to registration.
 *
 * AUTH_TIME_RECENCY_VIOLATION (user spent >120s at the biometric prompt) is
 * retried once: a fresh ceremony runs with a new PKCE pair, new passkey
 * assertion, and a new AuthSession prompt.
 *
 * On success the token bundle is persisted and `isAuthenticated` is set to true.
 * Throws AuthError on any ceremony or network failure.
 */
export async function loginWithKokioPasskey(credentialIdHint?: string, deviceWalletAddressOverride?: string): Promise<void> {
  let ceremony: { code: string; codeVerifier: string } | undefined;

  for (let attempt = 0; attempt <= 1; attempt++) {
    try {
      ceremony = await performLoginCeremony(credentialIdHint, deviceWalletAddressOverride);
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
