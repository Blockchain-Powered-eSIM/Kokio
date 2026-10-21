/**
 * One-time local wipe for the Base Sepolia (testnet) -> Base mainnet cutover.
 * Passkeys/wallets registered against the testnet contracts are meaningless
 * once the backend and contracts move to mainnet — the same situation as the
 * kokio-sdk v1 -> v3 migration (see sdkV3Reset.ts), so this follows the exact
 * same version-gated purge idiom.
 *
 * Inert until MAINNET_CUTOVER_ENABLED flips true (constants/general.constants.ts) —
 * calling this before then is a no-op.
 */
import * as SecureStore from 'expo-secure-store';
import { purgeAccountLocalState } from '@/utils/auth/purgeAccountLocalState';
import { markWelcomeBackPending } from '@/utils/auth/returningUserProbe';
import { useAuthStore } from '@/stores/authStore';
import { logger } from '@/utils/logger';
import { MAINNET_CUTOVER_ENABLED } from '@/constants/general.constants';

export const VERSION_KEY = 'kokioLocalDataVersion';
export const MAINNET_CUTOVER_VERSION = '3';

/**
 * A device is "returning" if an earlier build left the data-version key or a passkey credential behind. 
 * MUST run before runSdkV3MigrationIfNeeded()
 */
export async function isReturningDevice(): Promise<boolean> {
  try {
    const [version, credentialId] = await Promise.all([
      SecureStore.getItemAsync(VERSION_KEY),
      SecureStore.getItemAsync('credentialId'),
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
    const stored = await SecureStore.getItemAsync(VERSION_KEY);
    if (Number(stored) >= Number(MAINNET_CUTOVER_VERSION)) return;

    await purgeAccountLocalState();
    await useAuthStore.getState().clearTokens();
    // Written before the version, so a boot interrupted here re-runs the whole cutover
    if (returningDevice) await markWelcomeBackPending();
    await SecureStore.setItemAsync(VERSION_KEY, MAINNET_CUTOVER_VERSION);
    logger.debug('MAINNET_CUTOVER_LOCAL_DATA_RESET');
  } catch (err) {
    logger.error('MAINNET_CUTOVER_MIGRATION_FAILED', { err });
  }
}
