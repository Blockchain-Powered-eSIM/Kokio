/**
 * Client-tracked record of orders that have been submitted but have not yet
 * appeared in the server's terminal order list (GET /order/list only ever
 * returns COMPLETED/FAILED/ABANDONED-class orders — an order still in flight,
 * or one a backend job is stuck on, is invisible there). Lets the orders tab
 * surface a reference id for support before the server has a final answer.
 *
 * Entries are removed once a matching idempotencyKey shows up in the
 * terminal order list (self-healing — see app/(tabs)/orders.tsx), or when the
 * user dismisses one manually. There is no time-based auto-removal: a
 * DEVICE_WALLET order stuck at PAYMENT_PENDING is explicitly excluded from
 * the backend's abandoned-order cleanup job and can outlive any reasonable
 * TTL, which is exactly the case this feature exists to surface.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { logger } from '@/utils/logger';

const STORAGE_KEY = '@kokio_pending_orders';
export const PENDING_ORDERS_KEY = 'pending-orders' as const;

export interface PendingOrderRecord {
  correlationId: string;
  orderId?: string;
  catalogueId: string;
  planLabel?: string;
  paymentMethod: 'FIAT' | 'CRYPTO' | 'DEVICE_WALLET';
  createdAt: string;
}

export async function readPendingOrders(): Promise<PendingOrderRecord[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as PendingOrderRecord[]) : [];
  } catch (error) {
    logger.error('PENDING_ORDERS_READ_FAILED', { error });
    return [];
  }
}

async function writePendingOrders(records: PendingOrderRecord[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

export async function addPendingOrder(record: PendingOrderRecord): Promise<void> {
  const existing = await readPendingOrders();
  const next = [record, ...existing.filter((r) => r.correlationId !== record.correlationId)];
  await writePendingOrders(next);
}

export async function removePendingOrder(correlationId: string): Promise<void> {
  const existing = await readPendingOrders();
  await writePendingOrders(existing.filter((r) => r.correlationId !== correlationId));
}

export function usePendingOrders() {
  const queryClient = useQueryClient();

  const query = useQuery<PendingOrderRecord[]>({
    queryKey: [PENDING_ORDERS_KEY],
    queryFn: readPendingOrders,
    staleTime: 0,
    gcTime: Infinity,
    refetchOnMount: true,
  });

  const dismiss = async (correlationId: string) => {
    await removePendingOrder(correlationId);
    await queryClient.invalidateQueries({ queryKey: [PENDING_ORDERS_KEY] });
  };

  return {
    pendingOrders: query.data ?? [],
    isLoading: query.isLoading,
    refetch: query.refetch,
    dismiss,
  };
}
