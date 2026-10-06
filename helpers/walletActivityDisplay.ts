import type { ImageSourcePropType } from 'react-native';
import type { WalletActivityEntry } from '@/utils/walletActivity';

// TransactionDetails.tsx keys its top icon/color off `type === 'received'`
// specifically - reused here (rather than adding a new field there) so a
// positive event (deployed/granted) gets the green check and a revoked one
// gets the orange X, matching the existing detail screen's logic exactly.
const RECEIVED_TYPE = 'received';

export interface WalletActivityDisplayItem {
  id: string;
  name: string;
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
  switch (entry.type) {
    case 'WALLET_DEPLOYED':
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
    case 'ESIM_PURCHASED':
      return {
        id: entry.id,
        name: entry.label ? `eSIM purchased · ${entry.label}` : 'eSIM purchased',
        type: RECEIVED_TYPE,
        statusLabel: 'Purchase',
        amount: '—',
        status: 'completed',
        icon: require('@/assets/images/wallet/complete.png'),
        dateTime: formatDateTime(entry.timestamp),
      };
    case 'SENT':
      return {
        id: entry.id,
        name: entry.label ? `Sent to ${entry.label}` : 'Sent',
        type: 'sent',
        statusLabel: 'Send',
        amount: '—',
        status: 'completed',
        icon: require('@/assets/images/wallet/sendImg.png'),
        dateTime: formatDateTime(entry.timestamp),
      };
    case 'RECEIVED':
      return {
        id: entry.id,
        name: 'Received',
        type: RECEIVED_TYPE,
        statusLabel: 'Receive',
        amount: '—',
        status: 'completed',
        icon: require('@/assets/images/wallet/recieveImg.png'),
        dateTime: formatDateTime(entry.timestamp),
      };
    case 'PRICE_CAP_SET':
      return {
        id: entry.id,
        name: entry.label ? `Data bundle price cap · ${entry.label}` : 'Data bundle price cap',
        type: 'price cap',
        statusLabel: 'Price cap',
        amount: '—',
        status: 'completed',
        icon: require('@/assets/images/wallet/incomplete.png'),
        dateTime: formatDateTime(entry.timestamp),
      };
  }
}
