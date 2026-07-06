import type { components } from './generated/koKioBff';
import { unwrapBffResponse } from './koKioBffClient';
import api from '@/services/httpService';

type AccountResponse = components['schemas']['AccountResponse'];

export type { AccountResponse };

// Wallet-derivation material (pubKeyX/pubKeyY/salt/deviceWalletAddress) the client
// SDK needs to reconstruct the smart account after a reinstall. Identity is resolved
// server-side from the JWT — no params. Requires a recent step-up assertion (5 min
// recency window); call this immediately after a passkey login/recovery so that
// ceremony's auth_time satisfies it without a second biometric prompt.
export function getAccount(): Promise<AccountResponse> {
  return unwrapBffResponse<AccountResponse>(api.get('/v1/account'));
}
