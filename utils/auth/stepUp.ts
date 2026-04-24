import { Passkey } from 'react-native-passkey';
import * as SecureStore from 'expo-secure-store';
import { kokioAuthClient, type DpopProofBuilder } from './kokioAuthClient';
import { buildDpopProof } from './dpopProof';
import { parseIdToken } from './tokenStore';
import { AuthError } from './errors';
import { useAuthStore } from '@/stores/authStore';
import { Config } from '@/appKeys';

// ─── Response envelope helper (mirrors passkeyLogin.ts) ──────────────────────

type ApiBody<T> = { success?: boolean; code?: string; message?: string; data?: T };

function assertData<T>(raw: unknown, fallbackCode: string): T {
  const body = raw as ApiBody<T>;
  if (!body.data) throw new AuthError(body.code ?? fallbackCode, undefined, body.message);
  return body.data;
}

// ─── Step-up ceremony ─────────────────────────────────────────────────────────
//
// Flow: stepup/begin → Passkey.get → stepup/complete → swap AT (RT unchanged)
//
// The server spec guarantees no new refresh_token is issued. We pass the
// current RT only so the server can verify DPoP key continuity (cnf.jkt).
//
// AUTH-602 calls this function, then calls resolveStepUp() on success or
// rejectStepUp() on user cancel / error (see httpService.ts).

export async function performStepUp(): Promise<void> {
  const deviceWalletAddress = await SecureStore.getItemAsync('deviceWalletAddress');
  if (!deviceWalletAddress) throw new AuthError('NO_DEVICE_WALLET');

  const current = useAuthStore.getState().tokens;
  if (!current) throw new AuthError('STEP_UP_CANCELLED');

  // 1. Fetch WebAuthn options from the server.
  const opts = assertData<{
    challenge:        string;
    timeout:          number;
    rpId:             string;
    allowCredentials: { id: string; type: 'public-key'; transports?: string[] }[];
    userVerification: 'required';
  }>(
    await kokioAuthClient.stepUpBegin({ deviceWalletAddress }),
    'STEP_UP_FAILED',
  );

  // 2. Native biometric prompt — throws on user cancellation or timeout.
  const assertion = await Passkey.get({
    challenge:        opts.challenge,
    rpId:             opts.rpId,
    timeout:          opts.timeout,
    allowCredentials: opts.allowCredentials as { id: string; type: string }[],
    userVerification: opts.userVerification,
  });

  // 3. Complete the ceremony; DPoP nonce retry is handled inside kokioAuthClient.
  const stepUpUrl = `${Config.AUTH_SERVER_BASE_URL ?? ''}/v1/auth/stepup/complete`;
  const buildProof: DpopProofBuilder = (nonce) =>
    buildDpopProof({ htu: stepUpUrl, htm: 'POST', nonce });

  const resp = assertData<{
    access_token: string;
    token_type:   'DPoP';
    expires_in:   number;
    id_token:     string;
  }>(
    await kokioAuthClient.stepUpComplete(
      {
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
        refresh_token: current.refresh_token,
      },
      buildProof,
    ),
    'STEP_UP_FAILED',
  );

  // 4. Swap only the AT. The RT is intentionally kept — the server spec states
  //    "No new refresh token is issued" for a step-up grant.
  const { auth_time } = parseIdToken(resp.id_token);
  await useAuthStore.getState().setTokens({
    ...current,
    access_token: resp.access_token,
    id_token:     resp.id_token,
    expires_at:   Date.now() + resp.expires_in * 1_000,
    ...(auth_time !== undefined && { auth_time }),
  });
}
