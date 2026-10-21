import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";

import {
  DEFAULT_SHOP_FILTERS,
  isShopFiltersActive,
  type ShopFilters,
  type ShopFilterSheetHandle,
} from "@/utils/shopFilters";

interface ShopFiltersContextValue {
  filters: ShopFilters;
  isActive: boolean;
  setFilters: (next: ShopFilters) => void;
  clearFilters: () => void;
  sheetRef: React.RefObject<ShopFilterSheetHandle | null>;
  openFilterSheet: () => void;
}

const ShopFiltersContext = createContext<ShopFiltersContextValue | null>(null);

export function ShopFiltersProvider({ children }: { children: React.ReactNode }) {
  const [filters, setFiltersState] = useState<ShopFilters>(DEFAULT_SHOP_FILTERS);
  const sheetRef = useRef<ShopFilterSheetHandle>(null);

  const setFilters = useCallback((next: ShopFilters) => {
    setFiltersState(next);
  }, []);

  const clearFilters = useCallback(() => {
    setFiltersState(DEFAULT_SHOP_FILTERS);
  }, []);

  const openFilterSheet = useCallback(() => {
    sheetRef.current?.open();
  }, []);

  const value = useMemo(
    () => ({
      filters,
      isActive: isShopFiltersActive(filters),
      setFilters,
      clearFilters,
      sheetRef,
      openFilterSheet,
    }),
    [filters, setFilters, clearFilters, openFilterSheet]
  );

  return (
    <ShopFiltersContext.Provider value={value}>{children}</ShopFiltersContext.Provider>
  );
}

export function useShopFilters(): ShopFiltersContextValue {
  const ctx = useContext(ShopFiltersContext);
  if (!ctx) {
    throw new Error("useShopFilters must be used within a ShopFiltersProvider");
  }
  return ctx;
}
