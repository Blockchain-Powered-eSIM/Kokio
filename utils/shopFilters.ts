// Client-side plan filters for the Shop screen.
//
// The BFF's `/v1/catalogue` endpoint only supports server-side filtering by
// planType / vendor / coverageType / includeTopup / includeBackup — price,
// data amount, and validity have no server-side filter, so these presets
// filter the already-fetched `plans` array on the device.

export type PriceFilterKey = "ANY" | "UNDER_5" | "5_15" | "15_PLUS";
export type DataFilterKey =
  | "ANY"
  | "UNDER_1GB"
  | "1_5GB"
  | "5_10GB"
  | "10GB_PLUS"
  | "UNLIMITED";
export type ValidityFilterKey = "ANY" | "UNDER_7D" | "7_30D" | "30_90D" | "90D_PLUS";

export interface ShopFilters {
  price: PriceFilterKey;
  data: DataFilterKey;
  validity: ValidityFilterKey;
}

export const DEFAULT_SHOP_FILTERS: ShopFilters = {
  price: "ANY",
  data: "ANY",
  validity: "ANY",
};

/**
 * Imperative handle exposed by ShopFilterSheet. Lives here (not in the
 * component file) so ShopFiltersContext can reference the type without a
 * component -> context -> component import cycle.
 */
export interface ShopFilterSheetHandle {
  open: () => void;
}

export const PRICE_FILTER_OPTIONS: { key: PriceFilterKey; label: string }[] = [
  { key: "ANY", label: "Any price" },
  { key: "UNDER_5", label: "Under $5" },
  { key: "5_15", label: "$5 – $15" },
  { key: "15_PLUS", label: "$15+" },
];

export const DATA_FILTER_OPTIONS: { key: DataFilterKey; label: string }[] = [
  { key: "ANY", label: "Any data" },
  { key: "UNDER_1GB", label: "Up to 1GB" },
  { key: "1_5GB", label: "1 – 5GB" },
  { key: "5_10GB", label: "5 – 10GB" },
  { key: "10GB_PLUS", label: "10GB+" },
  { key: "UNLIMITED", label: "Unlimited" },
];

export const VALIDITY_FILTER_OPTIONS: { key: ValidityFilterKey; label: string }[] = [
  { key: "ANY", label: "Any validity" },
  { key: "UNDER_7D", label: "Up to 7 days" },
  { key: "7_30D", label: "8 – 30 days" },
  { key: "30_90D", label: "31 – 90 days" },
  { key: "90D_PLUS", label: "90+ days" },
];

export function isShopFiltersActive(filters: ShopFilters): boolean {
  return (
    filters.price !== "ANY" ||
    filters.data !== "ANY" ||
    filters.validity !== "ANY"
  );
}

interface FilterablePlan {
  actualSellingPrice: number;
  data?: number | null;
  isUnlimited: boolean;
  validity: number | null;
}

const matchesPrice = (plan: FilterablePlan, key: PriceFilterKey): boolean => {
  const price = plan.actualSellingPrice;
  switch (key) {
    case "UNDER_5":
      return price < 5;
    case "5_15":
      return price >= 5 && price <= 15;
    case "15_PLUS":
      return price > 15;
    case "ANY":
    default:
      return true;
  }
};

const matchesData = (plan: FilterablePlan, key: DataFilterKey): boolean => {
  if (key === "ANY") return true;
  if (key === "UNLIMITED") return plan.isUnlimited;
  if (plan.isUnlimited) return false; // unlimited plans only match the "Unlimited" bucket
  const amount = plan.data ?? 0;
  switch (key) {
    case "UNDER_1GB":
      return amount <= 1;
    case "1_5GB":
      return amount > 1 && amount <= 5;
    case "5_10GB":
      return amount > 5 && amount <= 10;
    case "10GB_PLUS":
      return amount > 10;
    default:
      return true;
  }
};

const matchesValidity = (plan: FilterablePlan, key: ValidityFilterKey): boolean => {
  if (key === "ANY") return true;
  const days = plan.validity ?? 0;
  switch (key) {
    case "UNDER_7D":
      return days > 0 && days <= 7;
    case "7_30D":
      return days > 7 && days <= 30;
    case "30_90D":
      return days > 30 && days <= 90;
    case "90D_PLUS":
      return days > 90;
    default:
      return true;
  }
};

export function applyShopFilters<T extends FilterablePlan>(
  plans: T[] | undefined | null,
  filters: ShopFilters
): T[] {
  if (!plans?.length) return [];
  if (!isShopFiltersActive(filters)) return plans;
  return plans.filter(
    (plan) =>
      matchesPrice(plan, filters.price) &&
      matchesData(plan, filters.data) &&
      matchesValidity(plan, filters.validity)
  );
}
