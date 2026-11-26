/**
 * Purge every local trace of the device account.
 * Deliberately context-free (no hooks, no React) so it can be invoked from the httpService interceptor.
 *
 * Covers three stores:
 *   1. SecureStore  —  credential + wallet-derivation artifacts, eSIM id.
 *   2. AsyncStorage —  purchasedESIMs mirror, pending orders, contacts, wallet activity.
 *   3. React Query  —  device-esims / device-orders are PERSISTED to AsyncStorage by the PersistQueryClientProvider.
 *                      Clearing the in-memory cache alone is not enough as without removeQueries + asyncStoragePersister purge,
 *                      a deleted account's eSIM list is restored on next cold boot.
 *
 * NOTE: does NOT clear auth tokens.
 */
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { queryClient, asyncStoragePersister } from '@/lib/api/query-client';
import { DEVICE_ESIMS_KEY, DEVICE_ORDERS_KEY } from '@/lib/query-keys';
import {
  CONTACT_IDS_KEY,
  CONTACT_KEY_PREFIX,
  CREDENTIAL_ID_KEY,
  CUSTOM_TOKENS_KEY,
  DEVICE_UID_KEY,
  DEVICE_WALLET_ADDRESS_KEY,
  ESIM_ID_KEY,
  PENDING_ORDERS_STORAGE_KEY,
  PUBLIC_KEY_X_KEY,
  PUBLIC_KEY_Y_KEY,
  RAW_SALT_KEY,
  purchasedEsimsKey,
  userDataKey,
  userWalletKey,
  walletActivityStorageKey,
} from '@/lib/storage/keys';
import { logger } from '@/lib/logger';

const SECURE_KEYS = [
  DEVICE_WALLET_ADDRESS_KEY,
  CREDENTIAL_ID_KEY,
  PUBLIC_KEY_X_KEY,
  PUBLIC_KEY_Y_KEY,
  RAW_SALT_KEY,
  DEVICE_UID_KEY,
  ESIM_ID_KEY,
] as const;

export async function purgeAccountLocalState(): Promise<void> {
  let deviceUID: string | null = null;
  try {
    const raw = await SecureStore.getItemAsync(DEVICE_UID_KEY);
    // Stored via JSON.stringify (kokio-storage saveJson, auth-provider signUpWithPasskey)
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
      AsyncStorage.removeItem(purchasedEsimsKey(deviceUID)).catch(() => {}),
      AsyncStorage.removeItem(walletActivityStorageKey(deviceUID)).catch(() => {}),
      SecureStore.deleteItemAsync(userWalletKey(deviceUID)).catch(() => {}),
      SecureStore.deleteItemAsync(userDataKey(deviceUID)).catch(() => {}),
    ]);
  }

  await AsyncStorage.removeItem(PENDING_ORDERS_STORAGE_KEY).catch(() => {});
  // Global key, not deviceUID-scoped.
  await AsyncStorage.removeItem(CUSTOM_TOKENS_KEY).catch(() => {});
  await AsyncStorage.getAllKeys()
    .then((keys) => keys.filter((k) => k === CONTACT_IDS_KEY || k.startsWith(CONTACT_KEY_PREFIX)))
    .then((keys) => AsyncStorage.multiRemove(keys))
    .catch(() => {});
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
