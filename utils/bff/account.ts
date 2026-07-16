import type { components } from './generated/koKioBff';
import { unwrapBffResponse } from './koKioBffClient';
import api from '@/services/httpService';

type AccountResponse = components['schemas']['AccountResponse'];

export type { AccountResponse };

/**
 * Wallet-derivation material (pubKeyX/pubKeyY/salt/deviceWalletAddress) the client SDK needs 
 * to reconstruct the smart account after a reinstall.
 * Identity is resolved server-side from the JWT — no params. Requires a recent step-up assertion.
 */
export function getAccount(): Promise<AccountResponse> {
  return unwrapBffResponse<AccountResponse>(api.get('/v1/account'));
}

// Permanently delete the authenticated device's account. IRREVERSIBLE.
export async function deleteAccount(): Promise<void> {
  await api.delete('/v1/account', { ...api.getConfig() });
}
