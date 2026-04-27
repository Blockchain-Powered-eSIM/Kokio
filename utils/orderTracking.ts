import * as SecureStore from 'expo-secure-store';

const USED_HASHES_KEY = 'usedTxnHashes';

async function getUsedHashes(): Promise<string[]> {
  const raw = await SecureStore.getItemAsync(USED_HASHES_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as string[];
  } catch {
    return [];
  }
}

export async function isHashUsed(txnHash: string): Promise<boolean> {
  const hashes = await getUsedHashes();
  return hashes.includes(txnHash);
}

export async function markHashUsed(txnHash: string): Promise<void> {
  const hashes = await getUsedHashes();
  if (!hashes.includes(txnHash)) {
    hashes.push(txnHash);
    await SecureStore.setItemAsync(USED_HASHES_KEY, JSON.stringify(hashes));
  }
}

export async function clearUsedHashes(): Promise<void> {
  await SecureStore.deleteItemAsync(USED_HASHES_KEY);
}
