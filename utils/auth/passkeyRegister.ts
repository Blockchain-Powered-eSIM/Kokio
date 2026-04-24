import { Passkey } from 'react-native-passkey';
import { kokioAuthClient, RegisterCompleteData } from './kokioAuthClient';
import { AuthError } from './errors';

/** @deprecated Use AuthError with code CREDENTIAL_EXISTS instead */
export class CredentialExistsError extends AuthError {
  constructor() {
    super('CREDENTIAL_EXISTS');
    this.name = 'CredentialExistsError';
  }
}

export type RegisterResult = RegisterCompleteData & {
  /** WebAuthn credential ID — needed locally to initialise the Kokio SDK. */
  credentialId: string;
};

/**
 * Full Kokio passkey registration ceremony.
 *
 * 1. POST /v1/auth/register/begin  → server returns WebAuthn creation options
 * 2. react-native-passkey Passkey.create() → native biometric prompt
 * 3. POST /v1/auth/register/complete → server verifies and returns
 *    { deviceWalletAddress, deviceUniqueIdentifier, registered }
 *
 * Returns the server data plus the WebAuthn credentialId so callers can
 * persist it for Kokio SDK initialisation without a second SecureStore read.
 *
 * Throws CredentialExistsError if the device already has a registered passkey
 * (server 409 CREDENTIAL_ALREADY_EXISTS).
 */
export async function registerPasskey(username: string): Promise<RegisterResult> {
  // 1. Fetch server-generated WebAuthn creation options
  const beginResp = await kokioAuthClient.registerBegin({ username });
  const beginBody = beginResp as unknown as { success?: boolean; code?: string; message?: string; data?: typeof beginResp.data; httpStatus?: number };
  if (!beginBody.data) {
    throw new AuthError(beginBody.code ?? 'REGISTRATION_FAILED', beginBody.httpStatus, beginBody.message);
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

  const completeBody = completeResp as unknown as { success?: boolean; code?: string; message?: string; data?: RegisterCompleteData; httpStatus?: number };

  if (!completeBody.success) {
    throw new AuthError(completeBody.code ?? 'REGISTRATION_FAILED', completeBody.httpStatus, completeBody.message);
  }
  if (!completeBody.data) throw new AuthError('REGISTRATION_FAILED');
  return { ...completeBody.data, credentialId: credential.id };
}
