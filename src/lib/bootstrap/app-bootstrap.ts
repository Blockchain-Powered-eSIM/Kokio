import _keyBy from "lodash/keyBy";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { components } from "@/lib/api/bff/generated/kokio-bff";
import { getServiceRegions } from "@/lib/api/bff/catalogue";
import { queryClient } from "@/lib/api/query-client";
import { SERVICE_REGIONS_KEY } from "@/lib/query-keys";
import { SERVICE_REGIONS_STORAGE_KEY } from "@/lib/storage/keys";
import { logger } from "@/lib/logger";

export type ServiceRegion = components["schemas"]["ServiceRegion"];

export type ServiceRegions = {
  countries: ServiceRegion[];
  regions: ServiceRegion[];
  countryConfig: Record<string, ServiceRegion>;
  regionConfig: Record<string, ServiceRegion>;
};

function toServiceRegions(countries: ServiceRegion[], regions: ServiceRegion[]): ServiceRegions {
  return {
    countries,
    regions,
    countryConfig: _keyBy(countries, "code"),
    regionConfig: _keyBy(regions, "code"),
  };
}

/** The countries and regions the shop sells in. Saved on the phone after each fetch so the next launch can skip the wait. */
export const serviceRegionsQuery = {
  queryKey: [SERVICE_REGIONS_KEY],
  queryFn: async (): Promise<ServiceRegions> => {
    const { countries = [], regions = [] } = await getServiceRegions();
    AsyncStorage.setItem(SERVICE_REGIONS_STORAGE_KEY, JSON.stringify({ countries, regions })).catch((error) =>
      logger.error("SERVICE_REGIONS_SAVE_FAILED", { error }),
    );
    return toServiceRegions(countries, regions);
  },
  staleTime: Infinity,
  // The launch loader shows its own Retry button, so fail fast instead of retrying in the background.
  retry: false,
};

/**
 * Puts the list saved by the last launch into the query cache. Returns false when there is none,
 * or it cannot be read, in which case the launch has to wait for the network.
 */
export async function restoreServiceRegions(): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(SERVICE_REGIONS_STORAGE_KEY);
    if (!raw) return false;
    const { countries, regions } = JSON.parse(raw);
    if (!Array.isArray(countries) || !Array.isArray(regions)) return false;
    queryClient.setQueryData(serviceRegionsQuery.queryKey, toServiceRegions(countries, regions));
    return true;
  } catch (error) {
    logger.error("SERVICE_REGIONS_RESTORE_FAILED", { error });
    return false;
  }
}

/** The loaded list, for code that runs outside a component (navigation options, helpers). */
export function getServiceRegionsSnapshot(): ServiceRegions | undefined {
  return queryClient.getQueryData<ServiceRegions>(serviceRegionsQuery.queryKey);
}
