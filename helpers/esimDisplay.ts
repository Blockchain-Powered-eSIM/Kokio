import type { ESimDocument, PlanHistoryEntry } from "@/utils/bff/esim";
import type { Esim } from "@/components/ESIMItem";

/**
 * Maps the server eSIM document to the minimal shape ESIMItem renders.
 * serviceRegionCode is not on ESimDocument, the flag renders via serviceRegionFlag when available.
 * ESIMItem accepts an absent serviceRegionCode.
 */
export function esimDocToDisplayItem(doc: ESimDocument): Esim {
  const entries: PlanHistoryEntry[] = doc.planHistory ?? [];
  const latest = entries[entries.length - 1] as PlanHistoryEntry | undefined;

  return {
    catalogueId:        '',
    actualSellingPrice: 0,
    isUnlimited:        latest?.isUnlimited      ?? false,
    serviceRegionCode:  undefined,
    serviceRegionFlag:  latest?.serviceRegionFlag ?? null,
    serviceRegionName:  latest?.serviceRegionName ?? null,
    coverageType:       latest?.coverageType      ?? 'LOCAL',
    data:               latest?.data              ?? null,
    sms:                latest?.sms               ?? null,
    voice:              latest?.voice             ?? null,
    validity:           latest?.validity          ?? null,
    info:               null,
  };
}
