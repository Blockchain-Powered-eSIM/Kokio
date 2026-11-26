import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type BottomSheet from "@gorhom/bottom-sheet";
import { useEsims } from "@/features/esim/use-esims";
import { useEsimCompatibility } from "@/features/esim/use-esim-compatibility";
import { esimDisplayName, esimDocToDisplayItem } from "@/features/esim/esim-display";
import { formatPlanLabel } from "./esim-order";

/** Whether an order tops up an existing eSIM, and which one. */
export type TopupSelection = { applyAsTopup: boolean; compatibleTopUpEsimRef?: string };

/** Finds the user's eSIMs this plan can top up and tracks which one, if any, is chosen. */
export function useTopupSelection(planId: string | undefined, orderCompleted: boolean) {
  const { esims }    = useEsims();
  const hasPriorEsim = esims.length > 0;
  const {
    isLoading: isCheckingTopup,
    isError: isTopupCheckError,
    error: topupCheckError,
    refetch: refetchTopupCompatibility,
    compatibleEsims,
    vendorMismatches,
    checkErrors,
  } = useEsimCompatibility(
    { planId },
    { enabled: hasPriorEsim && !orderCompleted },
  );
  const isTopupCompatible = compatibleEsims.length > 0;
  const [applyAsTopup, setApplyAsTopup]                     = useState(false);
  const [compatibleTopUpEsimRef, setCompatibleTopUpEsimRef] = useState<string | undefined>();
  const [showTopupConfirm, setShowTopupConfirm]             = useState(false);
  const topupPickerSheetRef = useRef<BottomSheet>(null);

  // Build a human-readable label for a compatible topup eSIM.
  // Source of truth is the live ESimDocument from useEsims() (server-truth),
  // using the latest PlanHistoryEntry for region/validity/data fields.
  // Falls back to ICCID last-4, then eSimRef abbreviation.
  const buildTopupEsimLabel = useCallback((eSimRef: string, iccid?: string): string => {
    const doc  = esims.find((e) => e.eSimRef === eSimRef);
    const plan = doc ? { ...esimDocToDisplayItem(doc), serviceRegionName: esimDisplayName(doc) } : null;
    const label = formatPlanLabel(plan);
    if (label) return label;
    if (iccid) return `ICCID ...${iccid.slice(-4)}`;
    return `${eSimRef.slice(0, 6)}...${eSimRef.slice(-4)}`;
  }, [esims]);

  // Append ICCID last-4 only when two labels collide.
  const topupEsimOptions = useMemo(() => {
    const withLabel = compatibleEsims.map(r => ({
      ...r, label: buildTopupEsimLabel(r.eSimRef, r.iccid),
    }));
    const counts = withLabel.reduce<Record<string, number>>((acc, o) => {
      acc[o.label] = (acc[o.label] ?? 0) + 1; return acc;
    }, {});
    return withLabel.map(o => ({
      ...o,
      label: counts[o.label] > 1 && o.iccid ? `${o.label} (...${o.iccid.slice(-4)})` : o.label,
    }));
  }, [compatibleEsims, buildTopupEsimLabel]);

  const topupPickerItems = useMemo(
    () => topupEsimOptions.map((o) => ({
      eSimRef: o.eSimRef,
      label:   o.label,
      doc:     esims.find((e) => e.eSimRef === o.eSimRef),
    })),
    [topupEsimOptions, esims],
  );

  const selectedTopupDoc = compatibleTopUpEsimRef
    ? esims.find((e) => e.eSimRef === compatibleTopUpEsimRef)
    : undefined;

  // Defaults to the most recently purchased compatible eSIM, once, the first
  // time a compatible match shows up - a manual pick or "Buy a new eSIM"
  // afterwards must stick, not get overridden by a later recompute.
  const hasAppliedDefaultTopupRef = useRef(false);
  useEffect(() => {
    if (hasAppliedDefaultTopupRef.current || topupPickerItems.length === 0) return;
    hasAppliedDefaultTopupRef.current = true;
    const latest = [...topupPickerItems].sort(
      (a, b) => (b.doc?.createdAt ?? '').localeCompare(a.doc?.createdAt ?? ''),
    )[0];
    setApplyAsTopup(true);
    setCompatibleTopUpEsimRef(latest.eSimRef);
  }, [topupPickerItems]);

  const clearSelection = () => {
    setApplyAsTopup(false);
    setCompatibleTopUpEsimRef(undefined);
  };

  const selectEsim = (eSimRef: string) => {
    setApplyAsTopup(true);
    setCompatibleTopUpEsimRef(eSimRef);
    topupPickerSheetRef.current?.close();
  };

  const buyNew = () => {
    clearSelection();
    topupPickerSheetRef.current?.close();
  };

  return {
    esims,
    isCheckingTopup,
    isTopupCheckError,
    topupCheckError,
    refetchTopupCompatibility,
    vendorMismatches,
    checkErrors,
    isTopupCompatible,
    applyAsTopup,
    compatibleTopUpEsimRef,
    selectedTopupDoc,
    topupPickerItems,
    topupPickerSheetRef,
    openPicker: () => topupPickerSheetRef.current?.snapToIndex(0),
    buildTopupEsimLabel,
    selectEsim,
    buyNew,
    clearSelection,
    showTopupConfirm,
    setShowTopupConfirm,
  };
}
