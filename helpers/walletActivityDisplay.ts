import type { ImageSourcePropType } from 'react-native';
import { formatUnits } from 'viem';
import type { WalletActivityEntry } from '@/utils/walletActivity';
import type { ActivityEntry } from '@/utils/bff/account';
import { truncateDecimals } from '@/hooks/useWalletTokens';
import { shortenAddress } from '@/utils/address';
import { DEVICE_WALLET_PAYMENT_ASSETS } from '@/constants/checkout.constants';

const STABLECOIN_SYMBOLS: ReadonlySet<string> = new Set(DEVICE_WALLET_PAYMENT_ASSETS);

// TransactionDetails.tsx keys its top icon/color off `type === 'received'`
// specifically - reused here (rather than adding a new field there) so a
// positive event (deployed/granted) gets the green check and a revoked one
// gets the orange X, matching the existing detail screen's logic exactly.
const RECEIVED_TYPE = 'received';

export interface WalletActivityDisplayItem {
  id: string;
  // Absent when there's no human-readable label for the counterparty (e.g. a
  // real on-chain transfer with no matching saved contact) - callers fall
  // back to showing walletId instead.
  name?: string;
  // Icon/color selector only (existing list/detail screens key off the
  // literal 'received' - see RECEIVED_TYPE above). Use statusLabel for the
  // human-readable text shown alongside it; showing this raw would read as
  // the confusing literal word "received" for a wallet-deployed event.
  type: string;
  statusLabel: string;
  amount: string;
  status: string;
  icon: ImageSourcePropType;
  dateTime: string;
  // Counterparty address (transfer) or eSIM-wallet address (price cap) -
  // shown/copyable when there's no resolved name.
  walletId?: string;
}

function formatDateTime(timestamp: number): string {
  return new Date(timestamp).toLocaleString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function walletActivityEntryToDisplayItem(entry: WalletActivityEntry): WalletActivityDisplayItem {
  if (entry.type === 'SENT') {
    return {
      id: entry.txHash ?? entry.id,
      name: entry.label ? `Sent to ${entry.label}` : undefined,
      type: 'sent',
      statusLabel: 'Sent',
      amount: entry.amount
        ? formatActivityAmount(entry.amount, entry.decimals, entry.symbol, undefined)
        : '—',
      status: 'completed',
      icon: require('@/assets/images/wallet/sendImg.png'),
      dateTime: formatDateTime(entry.timestamp),
      walletId: entry.counterparty,
    };
  }

  return {
    id: entry.id,
    name: 'Wallet created',
    type: RECEIVED_TYPE,
    statusLabel: 'Setup',
    amount: '—',
    status: 'completed',
    icon: require('@/assets/images/wallet/wallet.png'),
    dateTime: formatDateTime(entry.timestamp),
  };
}

function formatActivityAmount(
  amount: string,
  decimals: number | null | undefined,
  symbol: string | null | undefined,
  token: string | null | undefined,
): string {
  const places = symbol && STABLECOIN_SYMBOLS.has(symbol) ? 2 : 6;
  const formatted = truncateDecimals(formatUnits(BigInt(amount), decimals ?? 18), places);
  const label = symbol ?? shortenAddress(token ?? undefined);
  return `${formatted} ${label}`.trim();
}

/**
 * Maps a GET /account/activity entry (real on-chain transfer or eSIM-wallet
 * price-cap change) to the same display shape the local wallet-activity log
 * uses, so both can render through one set of list/detail screens.
 */
export function activityEntryToDisplayItem(entry: ActivityEntry): WalletActivityDisplayItem {
  const dateTime = formatDateTime(new Date(entry.time).getTime());

  if (entry.type === 'PRICE_CAP') {
    const capLabel = entry.priceCapUSDCents && entry.priceCapUSDCents !== '0'
      ? `$${(Number(entry.priceCapUSDCents) / 100).toFixed(2)} cap`
      : 'Default cap';
    return {
      id: entry.txHash,
      type: 'price cap',
      statusLabel: 'Price cap',
      amount: capLabel,
      status: 'completed',
      icon: require('@/assets/images/wallet/incomplete.png'),
      dateTime,
      walletId: entry.eSIMWallet ?? undefined,
    };
  }

  const received = entry.direction === 'IN';
  return {
    id: entry.txHash,
    type: received ? RECEIVED_TYPE : 'sent',
    statusLabel: received ? 'Received' : 'Sent',
    amount: entry.amount ? formatActivityAmount(entry.amount, entry.decimals, entry.symbol, entry.token) : '—',
    status: 'completed',
    icon: received ? require('@/assets/images/wallet/recieveImg.png') : require('@/assets/images/wallet/sendImg.png'),
    dateTime,
    walletId: (received ? entry.from : entry.to) ?? undefined,
  };
}
