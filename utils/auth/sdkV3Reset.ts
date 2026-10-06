/**
 * One-time local wipe for the kokio-sdk v1 -> v3 migration.
 * The backend database reset alongside the v3 contract redeploy, so a v1 build's
 * credentialId, deviceUID and deviceWalletAddress are all meaningless against it,
 * not just the derived wallet address. There is nothing to reconcile, only to clear.
 */
import * as SecureStore from 'expo-secure-store';
import { purgeAccountLocalState } from '@/utils/auth/purgeAccountLocalState';
import { useAuthStore } from '@/stores/authStore';
import { logger } from '@/utils/logger';

const VERSION_KEY = 'kokioLocalDataVersion';
const CURRENT_VERSION = '2';

export async function runSdkV3MigrationIfNeeded(): Promise<void> {
  try {
    const stored = await SecureStore.getItemAsync(VERSION_KEY);
    if (stored === CURRENT_VERSION) return;

    await purgeAccountLocalState();
    await useAuthStore.getState().clearTokens();
    await SecureStore.setItemAsync(VERSION_KEY, CURRENT_VERSION);
    logger.debug('SDK_V3_LOCAL_DATA_RESET');
  } catch (err) {
    logger.error('SDK_V3_MIGRATION_FAILED', { err });
  }
}
