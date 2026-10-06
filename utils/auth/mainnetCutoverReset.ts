/**
 * One-time local wipe for the Base Sepolia (testnet) -> Base mainnet cutover.
 * Passkeys/wallets registered against the testnet contracts are meaningless
 * once the backend and contracts move to mainnet — the same situation as the
 * kokio-sdk v1 -> v3 migration (see sdkV3Reset.ts), so this follows the exact
 * same version-gated purge idiom.
 *
 * Inert until MAINNET_CUTOVER_ENABLED flips true (constants/general.constants.ts) —
 * calling this before then is a no-op. See KokioSDKv3.md's "Testnet disclosure
 * & mainnet cutover" section for the activation steps.
 */
import * as SecureStore from 'expo-secure-store';
import { purgeAccountLocalState } from '@/utils/auth/purgeAccountLocalState';
import { useAuthStore } from '@/stores/authStore';
import { logger } from '@/utils/logger';
import { MAINNET_CUTOVER_ENABLED } from '@/constants/general.constants';

const VERSION_KEY = 'kokioLocalDataVersion';
const MAINNET_CUTOVER_VERSION = '3';

export async function runMainnetCutoverIfNeeded(): Promise<void> {
  if (!MAINNET_CUTOVER_ENABLED) return;

  try {
    const stored = await SecureStore.getItemAsync(VERSION_KEY);
    if (stored === MAINNET_CUTOVER_VERSION) return;

    await purgeAccountLocalState();
    await useAuthStore.getState().clearTokens();
    await SecureStore.setItemAsync(VERSION_KEY, MAINNET_CUTOVER_VERSION);
    logger.debug('MAINNET_CUTOVER_LOCAL_DATA_RESET');
  } catch (err) {
    logger.error('MAINNET_CUTOVER_MIGRATION_FAILED', { err });
  }
}
