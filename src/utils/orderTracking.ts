import * as SecureStore from 'expo-secure-store';
import { USED_TXN_HASHES_KEY } from '@/lib/storage/keys';

export async function clearUsedHashes(): Promise<void> {
  await SecureStore.deleteItemAsync(USED_TXN_HASHES_KEY);
}
