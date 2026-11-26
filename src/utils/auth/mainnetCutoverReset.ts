/**
 * One-time local wipe for the Base Sepolia (testnet) -> Base mainnet cutover.
 * Passkeys/wallets registered against the testnet contracts are meaningless
 * once the backend and contracts move to mainnet. Any device below this data
 * version (including ones still on a kokio-sdk v1 build) is wiped once.
 *
 * Inert while MAINNET_CUTOVER_ENABLED (lib/constants/app.ts) is false.
 */
import * as SecureStore from 'expo-secure-store';
import { purgeAccountLocalState } from '@/utils/auth/purgeAccountLocalState';
import { markWelcomeBackPending } from '@/utils/auth/returningUserProbe';
import { useAuthStore } from '@/stores/authStore';
import { logger } from '@/lib/logger';
import { MAINNET_CUTOVER_ENABLED } from '@/lib/constants/app';
import { CREDENTIAL_ID_KEY, LOCAL_DATA_VERSION_KEY } from '@/lib/storage/keys';

export const MAINNET_CUTOVER_VERSION = '3';

/**
 * A device is "returning" if an earlier build left the data-version key or a passkey credential behind.
 * MUST run before runMainnetCutoverIfNeeded(), which writes the data-version key.
 */
export async function isReturningDevice(): Promise<boolean> {
  try {
    const [version, credentialId] = await Promise.all([
      SecureStore.getItemAsync(LOCAL_DATA_VERSION_KEY),
      SecureStore.getItemAsync(CREDENTIAL_ID_KEY),
    ]);
    return version !== null || credentialId !== null;
  } catch (err) {
    logger.error('RETURNING_DEVICE_PROBE_FAILED', { err });
    return false;
  }
}

export async function runMainnetCutoverIfNeeded(returningDevice: boolean): Promise<void> {
  if (!MAINNET_CUTOVER_ENABLED) return;

  try {
    const stored = await SecureStore.getItemAsync(LOCAL_DATA_VERSION_KEY);
    if (Number(stored) >= Number(MAINNET_CUTOVER_VERSION)) return;

    await purgeAccountLocalState();
    await useAuthStore.getState().clearTokens();
    // Written before the version, so a boot interrupted here re-runs the whole cutover
    if (returningDevice) await markWelcomeBackPending();
    await SecureStore.setItemAsync(LOCAL_DATA_VERSION_KEY, MAINNET_CUTOVER_VERSION);
    logger.debug('MAINNET_CUTOVER_LOCAL_DATA_RESET');
  } catch (err) {
    logger.error('MAINNET_CUTOVER_MIGRATION_FAILED', { err });
  }
}
