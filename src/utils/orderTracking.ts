import * as SecureStore from 'expo-secure-store';

const USED_HASHES_KEY = 'usedTxnHashes';

export async function clearUsedHashes(): Promise<void> {
  await SecureStore.deleteItemAsync(USED_HASHES_KEY);
}
