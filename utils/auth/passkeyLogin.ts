import { Passkey } from 'react-native-passkey';
import { Platform } from 'react-native';
import * as AuthSession from 'expo-auth-session';
import * as SecureStore from 'expo-secure-store';
import { v4 as uuidv4 } from 'uuid';
import { kokioAuthClient } from './kokioAuthClient';
import { buildDpopProof } from './dpopProof';
import { parseIdToken } from './tokenStore';
import { AuthError } from './errors';
import { useAuthStore } from '@/stores/authStore';
import { Config } from '@/appKeys';
import { logger } from '@/utils/logger';

// ─── Shared types ────────────────────────────────────────────────────────────

export type DiscoverLoginResult = {
  credentialId: string;
  deviceWalletAddress: string;
};

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

/* Authorization-code capture (cross-platform)
 * `/authorize` returns the code only in the 302 Location.
 * No single mechanism reads it on both platforms:
 *    iOS       — ASWebAuthenticationSession (via promptAsync) can't match an https
 *                universal-link callback and hangs. A headless fetch is used instead
 *                that follows the redirect exposes the final URL via response.url.
 *    Android   — fetch doesn't surface the redirect target in response.url, but
 *                promptAsync + verified App Links capture the https redirect.
 *
 * Both branches return { code, codeVerifier } or throw an AuthError whose `code`
 * is the server/flow error code (e.g. AUTH_TIME_RECENCY_VIOLATION) so callers can retry on it.
 */
async function captureAuthorizationCode(
  request: AuthSession.AuthRequest,
  authorizationEndpoint: string,
  correlationId: string,
): Promise<{ code: string; codeVerifier: string }> {
  if (Platform.OS === 'android') {
    const result = await request.promptAsync(
      { authorizationEndpoint },
      { preferUniversalLinks: true },
    );
    logger.debug('AUTHORIZE_ANDROID_RESULT', { type: result.type});

    if (result.type === 'success') {
      const { code } = result.params;
      if (!code) throw new AuthError('AUTHORIZE_FAILED', undefined, 'No code in redirect');
      return { code, codeVerifier: request.codeVerifier! };
    }
    if (result.type === 'error') {
      throw new AuthError(result.params.error ?? 'AUTHORIZE_FAILED', undefined, result.params.error_description);
    }
    throw new AuthError('AUTHORIZE_FAILED', undefined, 'Authorization was dismissed');
  }

  // iOS (and any non-Android): headless follow → response.url
  const authUrl = await request.makeAuthUrlAsync({ authorizationEndpoint });
  const response = await fetch(authUrl, {
    method: 'GET',
    headers: { 'x-correlation-id': correlationId },
    redirect: 'follow',
  });
  const returnUrl = (response as unknown as { url?: string }).url ?? '';
  logger.debug('AUTHORIZE_IOS_RESULT', { status: response.status, responseUrl: returnUrl });

  if (returnUrl && /[?&](code|error)=/.test(returnUrl)) {
    const result = request.parseReturnUrl(returnUrl);
    if (result.type === 'success') {
      const { code } = result.params;
      if (!code) throw new AuthError('AUTHORIZE_FAILED', undefined, 'No code in redirect');
      return { code, codeVerifier: request.codeVerifier! };
    }
    if (result.type === 'error') {
      throw new AuthError(result.params.error ?? 'AUTHORIZE_FAILED', undefined, result.params.error_description);
    }
  }

  // No redirect captured means /authorize returned a non-redirect error (e.g. stale auth_time).
  const body = await response.json().catch(() => null) as { code?: string; message?: string } | null;
  throw new AuthError(body?.code ?? 'AUTHORIZE_FAILED', response.status, body?.message ?? 'No redirect from authorize endpoint');
}

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

  let assertion;
  try {
    logger.debug('PASSKEY Calling Passkey.get');
    // On Android, empty allowCredentials triggers discoverable-credential discovery
    // via Google Password Manager, which hangs or shows "Use another device" when
    // the credential isn't yet locally indexed. Use the stored credential ID to
    // target the credential directly and skip the cloud enumeration entirely.
    // transports: ['internal'] restricts the lookup to device-local storage.
    const resolvedId = credentialIdHint ?? await SecureStore.getItemAsync('credentialId') ?? undefined;
    const allowCredentials = resolvedId
      ? [{ id: resolvedId, type: 'public-key' as const, transports: ['internal'] as const }]
      : (beginData.allowCredentials as { id: string; type: string }[]).map(c => ({ ...c, transports: ['internal'] as const }));

    assertion = await Passkey.get({
      challenge:        beginData.challenge,
      rpId:             beginData.rpId,
      timeout:          beginData.timeout,
      // @ts-expect-error react-native-passkey does not export matched type PublicKeyCredentialDescriptor[]
      allowCredentials: allowCredentials,
      userVerification: beginData.userVerification,
    });
    logger.debug('PASSKEY_GOT_ASSERTION');
    logger.debug('PASSKEY_ASSERTION_RAW_USERHANDLE', assertion.response.userHandle);
  } catch (e) {
    logger.error('PASSKEY_ASSERTION_FAILED', { err: e });
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

  return await captureAuthorizationCode(request, `${base}/v1/auth/authorize`, correlationId);
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
 * On success the token bundle is persisted and `isAuthenticated` is set to true.
 * Throws AuthError on any ceremony or network failure.
 */
export async function loginWithKokioPasskey(credentialIdHint?: string, deviceWalletAddressOverride?: string): Promise<void> {
  const { code, codeVerifier } = await performLoginCeremony(credentialIdHint, deviceWalletAddressOverride);

  const tokenData = assertData<{
    access_token:  string;
    refresh_token: string;
    id_token:      string;
    expires_in:    number;
  }>(
    await kokioAuthClient.token(
      {
        grant_type:    'authorization_code',
        code,
        redirect_uri:  REDIRECT_URI,
        code_verifier: codeVerifier,
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
    auth_time:     auth_time ?? Math.floor(Date.now() / 1000),
  });
}

/**
 * ─── Discoverable-credential login (reinstall recovery) ──────────────────────
 * 
 * Used when SecureStore has been wiped (e.g. app uninstall/reinstall) but the
 * passkey still exists in the platform credential manager (Google Password
 * Manager / iCloud Keychain). Calls loginBegin with no deviceWalletAddress so
 * the server returns an empty allowCredentials challenge, letting the OS
 * present all synced Kokio passkeys to the user. On success, stores
 * deviceWalletAddress and credentialId in SecureStore so future logins use the
 * normal targeted flow.
 */
export async function discoverAndLoginWithPasskey(): Promise<DiscoverLoginResult> {
  const base = Config.AUTH_SERVER_BASE_URL;
  if (!base) throw new Error('AUTH_SERVER_BASE_URL is not configured');

  const beginData = assertData<{
    challenge:        string;
    timeout:          number;
    rpId:             string;
    allowCredentials: [];
    userVerification: 'required';
  }>(
    await kokioAuthClient.loginDiscoverBegin(),
    'LOGIN_FAILED',
  );

  const assertion = await Passkey.get({
    challenge:        beginData.challenge,
    rpId:             beginData.rpId,
    timeout:          beginData.timeout,
    allowCredentials: [],
    userVerification: beginData.userVerification,
  });
  logger.debug('PASSKEY_DISCOVER_USERHANDLE', { userHandle: assertion.response.userHandle });

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

  const correlationId = uuidv4();
  const request = new AuthSession.AuthRequest({
    clientId:    'kokio-bff',
    redirectUri: REDIRECT_URI,
    usePKCE:     true,
    state:       correlationId,
    extraParams: {
      device_wallet_address: completeData.deviceWalletAddress,
      auth_time:             String(completeData.authTime),
    },
  });

  const { code, codeVerifier } = await captureAuthorizationCode(request, `${base}/v1/auth/authorize`, correlationId);

  const tokenData = assertData<{
    access_token:  string;
    refresh_token: string;
    id_token:      string;
    expires_in:    number;
  }>(
    await kokioAuthClient.token(
      {
        grant_type:    'authorization_code',
        code,
        redirect_uri:  REDIRECT_URI,
        code_verifier: codeVerifier,
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
    auth_time:     auth_time ?? Math.floor(Date.now() / 1000),
  });

  await SecureStore.setItemAsync('deviceWalletAddress', completeData.deviceWalletAddress);
  await SecureStore.setItemAsync('credentialId', assertion.id);

  return { credentialId: assertion.id, deviceWalletAddress: completeData.deviceWalletAddress };
}
