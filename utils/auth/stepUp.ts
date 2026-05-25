import { Passkey } from 'react-native-passkey';
import { kokioAuthClient, type DpopProofBuilder } from './kokioAuthClient';
import { buildDpopProof } from './dpopProof';
import { parseIdToken } from './tokenStore';
import { AuthError } from './errors';
import { useAuthStore } from '@/stores/authStore';

// ─── Response envelope helper (mirrors passkeyLogin.ts) ──────────────────────

type ApiBody<T> = { success?: boolean; code?: string; message?: string; data?: T };

function assertData<T>(raw: unknown, fallbackCode: string): T {
  const body = raw as ApiBody<T>;
  if (!body.data) throw new AuthError(body.code ?? fallbackCode, undefined, body.message);
  return body.data;
}

// ─── Telemetry ────────────────────────────────────────────────────────────────

function logEvent(event: string, data?: Record<string, unknown>): void {
  if (__DEV__) console.log('[stepup]', event, data ?? '');
}

// ─── Step-up ceremony ─────────────────────────────────────────────────────────
//
// Flow: stepup/begin → Passkey.get → stepup/complete → swap AT (RT unchanged)
//
// The server spec guarantees no new refresh_token is issued. We pass the
// current RT only so the server can verify DPoP key continuity (cnf.jkt).
//
// authProvider calls this function, then calls resolveStepUp() on success or
// rejectStepUp(new StepUpCancelledError()) on user cancel (see httpService.ts).

export async function performStepUp(): Promise<void> {
  logEvent('stepup.started');

  const current = useAuthStore.getState().tokens;
  if (!current) {
    logEvent('stepup.failed', { reason: 'NO_TOKENS' });
    throw new AuthError('STEP_UP_CANCELLED');
  }

  try {
    // 1. Fetch WebAuthn options from the server — no body required.
    const opts = assertData<{
      challenge:        string;
      timeout:          number;
      rpId:             string;
      allowCredentials: { id: string; type: 'public-key'; transports?: string[] }[];
      userVerification: 'required';
    }>(
      await kokioAuthClient.stepUpBegin(),
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
    // htu is provided by authFetch from the actual request URL — do not hardcode it here.
    const buildProof: DpopProofBuilder = (nonce, htu) => {
      logEvent('stepup.buildProof', { htu, nonce: !!nonce });
      return buildDpopProof({ htu: htu!, htm: 'POST', nonce });
    };

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
          refresh_token: current.refresh_token,
        },
        buildProof,
      ),
      'STEP_UP_FAILED',
    );

    // 4. Swap only the AT. The RT is intentionally kept — the server spec states
    //    "No new refresh token is issued" for a step-up grant.
    // Read the latest store state here (not the pre-biometric snapshot) so that
    // a background refresh that ran during the prompt doesn't get its RT overwritten.
    const { auth_time } = parseIdToken(resp.id_token);
    const latest = useAuthStore.getState().tokens ?? current;
    await useAuthStore.getState().setTokens({
      ...latest,
      access_token: resp.access_token,
      id_token:     resp.id_token,
      expires_at:   Date.now() + resp.expires_in * 1_000,
      ...(auth_time !== undefined && { auth_time }),
    });

    logEvent('stepup.completed', { auth_time });
  } catch (err) {
    logEvent('stepup.failed', { error: err instanceof Error ? err.message : String(err) });
    throw err;
  }
}
