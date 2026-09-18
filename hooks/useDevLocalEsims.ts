/**
 * Dev-only, local-only eSIM wallet records created by checkout's "Device
 * Wallet" bypass (screens/checkout/Checkout.tsx, __DEV__ only). These never
 * touch the BFF and never appear outside a dev build — they exist purely so
 * the real on-chain top-up toggle (hooks/useEsimTopupAccess.ts) can be
 * exercised against a genuinely-deployed eSIM wallet without a live payment.
 *
 * Persisted to AsyncStorage directly (not through the PersistQueryClientProvider's
 * PERSISTED_KEYS allowlist in providers/index.tsx) since this data must never be
 * mistaken for server-truth eSIM state.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery } from '@tanstack/react-query';
import type { Esim } from '@/components/ESIMItem';
import type { ESimDocument, PlanHistoryEntry } from '@/utils/bff/esim';
import { logger } from '@/utils/logger';

const STORAGE_KEY = '@kokio_dev_local_esims';
export const DEV_LOCAL_ESIMS_KEY = 'dev-local-esims' as const;

interface DevLocalEsimInput {
  esimId: string;
  deviceId: string;
  createdAt: string;
  plan: Esim;
}

function toEsimDocument({ esimId, deviceId, createdAt, plan }: DevLocalEsimInput): ESimDocument {
  const planHistoryEntry: PlanHistoryEntry = {
    orderId: `dev-${Date.now()}`,
    planId: plan.catalogueId || 'DEV_TEST_PLAN',
    validity: plan.validity ?? 30,
    purchaseDate: createdAt,
    data: plan.data ?? null,
    sms: plan.sms ?? null,
    voice: plan.voice ?? null,
    serviceRegionName: plan.serviceRegionName ?? 'Test Region',
    serviceRegionFlag: plan.serviceRegionFlag ?? null,
    isUnlimited: plan.isUnlimited ?? false,
    coverageType: (plan.coverageType as PlanHistoryEntry['coverageType']) ?? 'LOCAL',
    bundleStatus: 'ACTIVE',
  };

  return {
    iccid: `DEV${esimId.slice(2, 18).toUpperCase()}`,
    esimId,
    deviceId,
    vendor: 'DEV_TEST',
    planId: planHistoryEntry.planId,
    activationStatus: 'INSTALLED',
    createdAt,
    updatedAt: createdAt,
    planHistory: [planHistoryEntry],
  };
}

export async function readDevLocalEsims(): Promise<ESimDocument[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as ESimDocument[]) : [];
  } catch (error) {
    logger.error('DEV_LOCAL_ESIMS_READ_FAILED', { error });
    return [];
  }
}

export async function addDevLocalEsim(entry: DevLocalEsimInput): Promise<void> {
  const existing = await readDevLocalEsims();
  const next = [toEsimDocument(entry), ...existing];
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

/** Empty (and disabled) outside __DEV__ — the query itself never runs. */
export function useDevLocalEsims(): ESimDocument[] {
  const query = useQuery<ESimDocument[]>({
    queryKey: [DEV_LOCAL_ESIMS_KEY],
    queryFn: readDevLocalEsims,
    enabled: __DEV__,
    staleTime: Infinity,
    gcTime: Infinity,
  });
  return query.data ?? [];
}
