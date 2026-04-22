import { Passkey } from 'react-native-passkey';
import { kokioAuthClient, RegisterCompleteData } from './kokioAuthClient';

export class CredentialExistsError extends Error {
  readonly code = 'CREDENTIAL_EXISTS' as const;
  constructor() {
    super('A passkey is already registered for this device');
    this.name = 'CredentialExistsError';
  }
}

/**
 * Full Kokio passkey registration ceremony.
 *
 * 1. POST /v1/auth/register/begin  → server returns WebAuthn creation options
 * 2. react-native-passkey Passkey.create() → native biometric prompt
 * 3. POST /v1/auth/register/complete → server verifies and returns
 *    { deviceWalletAddress, deviceUniqueIdentifier, registered }
 *
 * Throws CredentialExistsError if the device already has a registered passkey
 * (server 409 CREDENTIAL_ALREADY_EXISTS).
 */
export async function registerPasskey(username: string): Promise<RegisterCompleteData> {
  // 1. Fetch server-generated WebAuthn creation options
  const beginResp = await kokioAuthClient.registerBegin({ username });
  const beginBody = beginResp as unknown as { success?: boolean; code?: string; message?: string; data?: typeof beginResp.data };
  if (!beginBody.data) {
    throw new Error(beginBody.message ?? 'Registration options unavailable');
  }
  const options = beginBody.data;

  // 2. Native passkey ceremony — RegistrationOptionsResponse maps 1-to-1 to PasskeyCreateRequest
  const credential = await Passkey.create({
    challenge: options.challenge,
    rp: options.rp,
    user: options.user,
    pubKeyCredParams: options.pubKeyCredParams as { type: string; alg: number }[],
    timeout: options.timeout,
    excludeCredentials: [],
    authenticatorSelection: options.authenticatorSelection,
    attestation: options.attestation,
  });

  // 3. Complete registration — server verifies attestation and derives wallet address
  const completeResp = await kokioAuthClient.registerComplete({
    attestationResponse: {
      id: credential.id,
      rawId: credential.rawId,
      response: {
        clientDataJSON: credential.response.clientDataJSON,
        attestationObject: credential.response.attestationObject,
      },
      type: 'public-key',
      clientExtensionResults: {},
    },
  });

  const completeBody = completeResp as unknown as { success?: boolean; code?: string; message?: string; data?: RegisterCompleteData };

  if (!completeBody.success) {
    if (completeBody.code === 'CREDENTIAL_ALREADY_EXISTS') throw new CredentialExistsError();
    throw new Error(completeBody.message ?? 'Registration failed');
  }
  if (!completeBody.data) throw new Error('Registration succeeded but no data returned');
  return completeBody.data;
}
