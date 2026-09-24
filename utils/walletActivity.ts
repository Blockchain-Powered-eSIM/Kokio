/**
 * A local, per-device log of wallet lifecycle events (device wallet deployed,
 * eSIM top-up access granted/revoked). There is no backend/indexer source for
 * this (see KokioSDKv3.md Section 7, "Awaiting backend"), so this only
 * records events this app instance itself observes going forward - it cannot
 * backfill history from before this feature existed or from other devices.
 * That is deliberate: showing a shorter, honest list beats fabricating one.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

export type WalletActivityType =
  | 'WALLET_DEPLOYED'
  | 'TOPUP_ACCESS_GRANTED'
  | 'TOPUP_ACCESS_REVOKED';

export interface WalletActivityEntry {
  id: string;
  type: WalletActivityType;
  timestamp: number;
  /** Human-readable eSIM name/region, for TOPUP_ACCESS_* entries. */
  label?: string;
}

export const WALLET_ACTIVITY_KEY = 'wallet-activity' as const;

const MAX_ENTRIES = 50;

function storageKey(deviceUID: string): string {
  return `kokio.walletActivity.${deviceUID}`;
}

export async function getWalletActivityEntries(deviceUID: string): Promise<WalletActivityEntry[]> {
  try {
    const raw = await AsyncStorage.getItem(storageKey(deviceUID));
    return raw ? (JSON.parse(raw) as WalletActivityEntry[]) : [];
  } catch {
    return [];
  }
}

export async function appendWalletActivityEntry(
  deviceUID: string,
  entry: Omit<WalletActivityEntry, 'id'>,
): Promise<void> {
  const existing = await getWalletActivityEntries(deviceUID);
  const withNew: WalletActivityEntry[] = [
    { ...entry, id: `${entry.timestamp}-${Math.random().toString(36).slice(2, 8)}` },
    ...existing,
  ].slice(0, MAX_ENTRIES);
  await AsyncStorage.setItem(storageKey(deviceUID), JSON.stringify(withNew));
}
