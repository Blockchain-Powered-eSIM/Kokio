/**
 * A local, per-device log of wallet lifecycle events (device wallet deployed,
 * purchases, sends). There is no backend/indexer source for
 * this (see KokioSDKv3.md Section 7, "Awaiting backend"), so this only
 * records events this app instance itself observes going forward - it cannot
 * backfill history from before this feature existed or from other devices.
 * That is deliberate: showing a shorter, honest list beats fabricating one.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

export type WalletActivityType =
  | 'WALLET_DEPLOYED'
  | 'ESIM_PURCHASED'
  | 'SENT'
  | 'RECEIVED'
  | 'PRICE_CAP_SET';

export interface WalletActivityEntry {
  id: string;
  type: WalletActivityType;
  timestamp: number;
  /** Human-readable eSIM name/region, when the event relates to one. */
  label?: string;
}

export const WALLET_ACTIVITY_KEY = 'wallet-activity' as const;

const MAX_ENTRIES = 50;

export function walletActivityStorageKey(deviceUID: string): string {
  return `kokio.walletActivity.${deviceUID}`;
}

// Entries from the removed eSIM top-up toggle may still be stored on devices that used it.
const REMOVED_ENTRY_TYPES = new Set(['TOPUP_ACCESS_GRANTED', 'TOPUP_ACCESS_REVOKED']);

export async function getWalletActivityEntries(deviceUID: string): Promise<WalletActivityEntry[]> {
  try {
    const raw = await AsyncStorage.getItem(walletActivityStorageKey(deviceUID));
    if (!raw) return [];
    return (JSON.parse(raw) as WalletActivityEntry[]).filter((entry) => !REMOVED_ENTRY_TYPES.has(entry.type));
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
  await AsyncStorage.setItem(walletActivityStorageKey(deviceUID), JSON.stringify(withNew));
}
