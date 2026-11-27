import _keyBy from "lodash/keyBy";
import type { components } from "@/lib/api/bff/generated/kokio-bff";
import { getServiceRegions } from "@/lib/api/bff/catalogue";
import { queryClient } from "@/lib/api/query-client";
import { SERVICE_REGIONS_KEY } from "@/lib/query-keys";

export type ServiceRegion = components["schemas"]["ServiceRegion"];

export type ServiceRegions = {
  countries: ServiceRegion[];
  regions: ServiceRegion[];
  countryConfig: Record<string, ServiceRegion>;
  regionConfig: Record<string, ServiceRegion>;
};

/** The countries and regions the shop sells in, fetched once on launch. */
export const serviceRegionsQuery = {
  queryKey: [SERVICE_REGIONS_KEY],
  queryFn: async (): Promise<ServiceRegions> => {
    const { countries = [], regions = [] } = await getServiceRegions();
    return {
      countries,
      regions,
      countryConfig: _keyBy(countries, "code"),
      regionConfig: _keyBy(regions, "code"),
    };
  },
  staleTime: Infinity,
  // The launch loader shows its own Retry button, so fail fast instead of retrying in the background.
  retry: false,
};

/** The loaded list, for code that runs outside a component (navigation options, helpers). */
export function getServiceRegionsSnapshot(): ServiceRegions | undefined {
  return queryClient.getQueryData<ServiceRegions>(serviceRegionsQuery.queryKey);
}
