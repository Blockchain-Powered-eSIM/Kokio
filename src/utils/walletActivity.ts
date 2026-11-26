/**
 * A local, per-device log of wallet events this device's own app instance
 * can know about immediately and with certainty, without waiting on the
 * BFF. GET /account/activity (see hooks/useAccountActivity.ts) is fed by an
 * Alchemy webhook running asynchronously against the chain - it is the only
 * way to learn about a RECEIVED transfer or a PRICE_CAP change (events this
 * device did not itself originate), but it is the wrong source for a SENT
 * transfer: a send is a client-side on-chain action, confirmed here the
 * moment `waitForUserOperationReceipt` resolves, with real amount/hash/
 * recipient already in hand - using the webhook-fed feed for that would
 * mean a user who just sent something doesn't see it until Alchemy's
 * delivery (and the BFF's processing of it) catches up.
 *
 * Covers WALLET_DEPLOYED (one-time, no backend equivalent at all) and SENT
 * (real-time, de-duplicated against GET /account/activity by txHash once
 * the backend's own record of the same transfer arrives - see
 * hooks/useWalletActivityFeed.ts). It cannot backfill history from before
 * this feature existed or from other devices. That is deliberate: showing a
 * shorter, honest list beats fabricating one.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

export type WalletActivityType = 'WALLET_DEPLOYED' | 'SENT';

export interface WalletActivityEntry {
  id: string;
  type: WalletActivityType;
  timestamp: number;
  /** Human-readable contact name, when the event relates to one. */
  label?: string;
  /** SENT only - the real on-chain transaction hash, for dedup + explorer links. */
  txHash?: string;
  /** SENT only - base units, decimal string. */
  amount?: string;
  decimals?: number;
  symbol?: string;
  /** SENT only - the recipient address. */
  counterparty?: string;
}

export const WALLET_ACTIVITY_KEY = 'wallet-activity' as const;

const MAX_ENTRIES = 50;

export function walletActivityStorageKey(deviceUID: string): string {
  return `kokio.walletActivity.${deviceUID}`;
}

// Entries from the removed eSIM top-up toggle, and from the never-wired
// ESIM_PURCHASED/RECEIVED/PRICE_CAP_SET types now superseded by
// GET /account/activity, may still be stored on devices that had them.
const REMOVED_ENTRY_TYPES = new Set([
  'TOPUP_ACCESS_GRANTED', 'TOPUP_ACCESS_REVOKED',
  'ESIM_PURCHASED', 'RECEIVED', 'PRICE_CAP_SET',
]);

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
