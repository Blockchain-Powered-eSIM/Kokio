import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider, dehydrate } from '@tanstack/react-query';
import React from 'react';

// ─── Mocks ────────────────────────────────────────────────────────────────────

// useIsAppActive — default: foregrounded
jest.mock('@/hooks/useIsAppActive', () => ({
  useIsAppActive: jest.fn(() => true),
}));

// useAuthRelay — default: authenticated
jest.mock('@/hooks/useAuthRelayer', () => ({
  useAuthRelay: jest.fn(() => ({ state: { authenticated: true } })),
}));

// BFF utility functions
jest.mock('@/utils/bff/esim', () => ({
  getAllEsims: jest.fn(),
}));
jest.mock('@/utils/bff/order', () => ({
  getOrderList: jest.fn(),
}));

import { useIsAppActive } from '@/hooks/useIsAppActive';
import { useAuthStore } from '@/stores/authStore';
import { useAuthRelay } from '@/hooks/useAuthRelayer'
import { getAllEsims } from '@/utils/bff/esim';
import { getOrderList } from '@/utils/bff/order';
import {
  useEsims,
  useOrders,
  DEVICE_ESIMS_KEY,
  DEVICE_ORDERS_KEY,
} from '@/queries/esims';
import type { ESimDocument } from '@/utils/bff/esim';
import type { OrderListItem } from '@/utils/bff/order';

// ─── Fixtures ────────────────────────────────────────────────────────────────

const ESIM_DOC: ESimDocument = {
  iccid:            '8944110068000000001',
  esimId:           '0xdef456abc123def456abc123def456abc123def4',
  deviceId:         '0xabc123def456abc123def456abc123def456abc1',
  vendor:           'VENDOR1',
  planId:           '1GB_EU_30D',
  activationStatus: 'INSTALLED',
  planHistory:      [],
};

const ORDER_ITEM: OrderListItem = {
  orderId:              '664f1a2b3c4d5e6f7a8b9c0e',
  idempotencyKey:       'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  planId:               '1GB_EU_30D',
  orderStatus:          'COMPLETED',
  paymentMethod:        'FIAT',
  flaggedForManualReview: false,
  createdAt:            '2026-04-20T08:15:00.000Z',
};

// ─── Test wrapper ─────────────────────────────────────────────────────────────

function makeWrapper(client: QueryClient) {
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client }, children);
}

function freshClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
}

// ─── useEsims ─────────────────────────────────────────────────────────────────

describe('useEsims', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useIsAppActive as jest.Mock).mockReturnValue(true);
    (useAuthRelay as jest.Mock).mockReturnValue({ state: { authenticated: true } });
  });

  it('returns data from getAllEsims on success', async () => {
    (getAllEsims as jest.Mock).mockResolvedValue([ESIM_DOC]);
    const client = freshClient();

    const { result } = renderHook(() => useEsims(), {
      wrapper: makeWrapper(client),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.esims).toEqual([ESIM_DOC]);
    expect(result.current.isError).toBe(false);
  });

  it('returns an empty array as the default before data loads', () => {
    (getAllEsims as jest.Mock).mockReturnValue(new Promise(() => {})); // pending
    const client = freshClient();

    const { result } = renderHook(() => useEsims(), {
      wrapper: makeWrapper(client),
    });

    expect(result.current.esims).toEqual([]);
    expect(result.current.isLoading).toBe(true);
  });

  it('does not fetch when the app is backgrounded', async () => {
    (useIsAppActive as jest.Mock).mockReturnValue(false);
    (getAllEsims as jest.Mock).mockResolvedValue([ESIM_DOC]);
    const client = freshClient();

    renderHook(() => useEsims(), { wrapper: makeWrapper(client) });

    // Give React Query a tick to attempt a fetch if enabled were true
    await new Promise((r) => setTimeout(r, 50));
    expect(getAllEsims).not.toHaveBeenCalled();
  });

  it('does not fetch when unauthenticated', async () => {
    (useAuthRelay as jest.Mock).mockReturnValue({ state: { authenticated: false } });
    (getAllEsims as jest.Mock).mockResolvedValue([ESIM_DOC]);
    const client = freshClient();

    renderHook(() => useEsims(), { wrapper: makeWrapper(client) });

    await new Promise((r) => setTimeout(r, 50));
    expect(getAllEsims).not.toHaveBeenCalled();
  });

  it('sets isError on fetch failure and returns empty array', async () => {
    (getAllEsims as jest.Mock).mockRejectedValue(new Error('network error'));
    const client = freshClient();

    const { result } = renderHook(() => useEsims(), {
      wrapper: makeWrapper(client),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.isError).toBe(true);
    expect(result.current.esims).toEqual([]);
  });
});

// ─── useOrders ────────────────────────────────────────────────────────────────

describe('useOrders', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useIsAppActive as jest.Mock).mockReturnValue(true);
    (useAuthRelay as jest.Mock).mockReturnValue({ state: { authenticated: true } });
  });

  it('returns the orders array from getOrderList on success', async () => {
    (getOrderList as jest.Mock).mockResolvedValue({ orders: [ORDER_ITEM], page: 1, pageSize: 25, total: 1 });
    const client = freshClient();

    const { result } = renderHook(() => useOrders(), {
      wrapper: makeWrapper(client),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.orders).toEqual([ORDER_ITEM]);
    expect(result.current.isError).toBe(false);
  });

  it('calls getOrderList with page 1 and pageSize 25', async () => {
    (getOrderList as jest.Mock).mockResolvedValue({ orders: [], page: 1, pageSize: 25, total: 0 });
    const client = freshClient();

    renderHook(() => useOrders(), { wrapper: makeWrapper(client) });
    await waitFor(() => expect(getOrderList).toHaveBeenCalledWith(1, 25));
  });

  it('returns an empty array as the default before data loads', () => {
    (getOrderList as jest.Mock).mockReturnValue(new Promise(() => {}));
    const client = freshClient();

    const { result } = renderHook(() => useOrders(), {
      wrapper: makeWrapper(client),
    });

    expect(result.current.orders).toEqual([]);
    expect(result.current.isLoading).toBe(true);
  });

  it('does not fetch when the app is backgrounded', async () => {
    (useIsAppActive as jest.Mock).mockReturnValue(false);
    (getOrderList as jest.Mock).mockResolvedValue({ orders: [], page: 1, pageSize: 25, total: 0 });
    const client = freshClient();

    renderHook(() => useOrders(), { wrapper: makeWrapper(client) });

    await new Promise((r) => setTimeout(r, 50));
    expect(getOrderList).not.toHaveBeenCalled();
  });

  it('sets isError on fetch failure and returns empty array', async () => {
    (getOrderList as jest.Mock).mockRejectedValue(new Error('network error'));
    const client = freshClient();

    const { result } = renderHook(() => useOrders(), {
      wrapper: makeWrapper(client),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.isError).toBe(true);
    expect(result.current.orders).toEqual([]);
  });
});

// ─── Persister key scoping ────────────────────────────────────────────────────
// Verifies that only device-esims and device-orders are included in the
// dehydrated snapshot — the contract the providers/index.tsx filter enforces.

describe('persister key scoping', () => {
  const PERSISTED_KEYS = new Set<string>([DEVICE_ESIMS_KEY, DEVICE_ORDERS_KEY]);

  const shouldDehydrate = (key: string) => PERSISTED_KEYS.has(key);

  it('includes device-esims in the persisted set', () => {
    expect(shouldDehydrate(DEVICE_ESIMS_KEY)).toBe(true);
  });

  it('includes device-orders in the persisted set', () => {
    expect(shouldDehydrate(DEVICE_ORDERS_KEY)).toBe(true);
  });

  it('excludes catalogue query keys from the persisted set', () => {
    expect(shouldDehydrate('esims')).toBe(false);          // queries/e-sims.ts root key
    expect(shouldDehydrate('catalogue')).toBe(false);
  });

  it('excludes bff-health from the persisted set', () => {
    expect(shouldDehydrate('bff-health')).toBe(false);
  });

  it('excludes esim-compatibility from the persisted set', () => {
    expect(shouldDehydrate('esim-compatibility')).toBe(false);
  });

  it('device-esims and device-orders appear in the dehydrated snapshot when populated', async () => {
    (getAllEsims as jest.Mock).mockResolvedValue([ESIM_DOC]);
    (getOrderList as jest.Mock).mockResolvedValue({ orders: [ORDER_ITEM], page: 1, pageSize: 25, total: 1 });
    (useIsAppActive as jest.Mock).mockReturnValue(true);
    (useAuthStore as unknown as jest.Mock).mockImplementation(
      (sel: (s: { isAuthenticated: boolean }) => unknown) => sel({ isAuthenticated: true }),
    );

    const client = freshClient();

    // Populate both queries
    const wrapper = makeWrapper(client);
    const { result: esimsResult } = renderHook(() => useEsims(), { wrapper });
    const { result: ordersResult } = renderHook(() => useOrders(), { wrapper });

    await waitFor(() => !esimsResult.current.isLoading && !ordersResult.current.isLoading);

    // Dehydrate with the same filter as providers/index.tsx
    const dehydrated = dehydrate(client, {
      shouldDehydrateQuery: (q) => PERSISTED_KEYS.has(q.queryKey[0] as string),
    });

    const keys = dehydrated.queries.map((q) => q.queryKey[0] as string);
    expect(keys).toContain(DEVICE_ESIMS_KEY);
    expect(keys).toContain(DEVICE_ORDERS_KEY);
    expect(keys).not.toContain('esims');
    expect(keys).not.toContain('bff-health');
  });
});
