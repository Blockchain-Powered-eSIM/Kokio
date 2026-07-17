/**
 * Purge every local trace of the device account.
 * Deliberately context-free (no hooks, no React) so it can be invoked from the httpService interceptor.
 *
 * Covers three stores:
 *   1. SecureStore  —  credential + wallet-derivation artifacts.
 *   2. AsyncStorage —  purchasedESIMs mirror.
 *   3. React Query  —  device-esims / device-orders are PERSISTED to AsyncStorage by the PersistQueryClientProvider.
 *                      Clearing the in-memory cache alone is not enough as without removeQueries + asyncStoragePersister purge,
 *                      a deleted account's eSIM list is restored on next cold boot.
 *
 * NOTE: does NOT clear auth tokens.
 */
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { queryClient, asyncStoragePersister } from '@/providers';
import { DEVICE_ESIMS_KEY, DEVICE_ORDERS_KEY } from '@/hooks/useDeviceEsims';
import { logger } from '@/utils/logger';

const SECURE_KEYS = [
  'deviceWalletAddress',
  'credentialId',
  'publicKeyX',
  'publicKeyY',
  'rawSalt',
  'deviceUID',
] as const;

export async function purgeAccountLocalState(): Promise<void> {
  let deviceUID: string | null = null;
  try {
    const raw = await SecureStore.getItemAsync('deviceUID');
    // Stored via JSON.stringify (kokioProvider.saveValueForDeviceUID, authProvider.signUpWithPasskey)
    if (raw) {
      try { deviceUID = JSON.parse(raw) as string; } catch { deviceUID = raw; }
    }
  } catch {
    /* best-effort */
  }
  await Promise.all(
    SECURE_KEYS.map((k) => SecureStore.deleteItemAsync(k).catch(() => {})),
  );

  if (deviceUID) {
    await Promise.all([
      AsyncStorage.removeItem(`purchasedESIMs-${deviceUID}`).catch(() => {}),
      SecureStore.deleteItemAsync(`userWallet-${deviceUID}`).catch(() => {}),
      SecureStore.deleteItemAsync(`userData-${deviceUID}`).catch(() => {}),
    ]);
  }
  try {
    queryClient.removeQueries({ queryKey: [DEVICE_ESIMS_KEY] });
    queryClient.removeQueries({ queryKey: [DEVICE_ORDERS_KEY] });
    queryClient.clear();
    await asyncStoragePersister.removeClient();
  } catch (err) {
    logger.error('ACCOUNT_PURGE_QUERY_CACHE_FAILED', { err });
  }

  logger.debug('ACCOUNT_LOCAL_STATE_PURGED');
}
