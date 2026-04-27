import { useQuery, type UseQueryOptions } from "@tanstack/react-query";
import _defaults from "lodash/defaults";

import { getPlans } from "@/utils/bff/catalogue";
import type { CataloguePlan } from "@/utils/bff/catalogue";

type EsimsQueryOptions = Omit<UseQueryOptions<CataloguePlan[]>, "queryKey" | "queryFn">;

const defaultOptions: EsimsQueryOptions = {
  retry: false,
  gcTime: 0,
};

export const emisQueryKeys = {
  all: ["esims"] as const,
  esimsByCountry: (item: string) => [...emisQueryKeys.all, "byCountry", item] as const,
  esimsByRegion: (item: string) => [...emisQueryKeys.all, "byRegion", item] as const,
  esimsByGlobal: (item: string) => [...emisQueryKeys.all, "byGlobal", item] as const,
  esimsByCustom: (item: string) => [...emisQueryKeys.all, "byCustom", item] as const,
};

export function useEsimsByCountry(serviceRegionCode: string, options: EsimsQueryOptions = defaultOptions) {
  return useQuery<CataloguePlan[]>({
    queryKey: emisQueryKeys.esimsByCountry(serviceRegionCode),
    queryFn: async () => {
      try {
        const response = await getPlans({ serviceRegionCode });
        return response.plans;
      } catch {
        return [];
      }
    },
    ..._defaults(options, { ...defaultOptions }),
  });
}

export function useEsimsByRegion(region: string, options: EsimsQueryOptions = defaultOptions) {
  return useQuery<CataloguePlan[]>({
    queryKey: emisQueryKeys.esimsByRegion(region),
    queryFn: async () => {
      try {
        const response = await getPlans({ serviceRegionCode: region });
        return response.plans;
      } catch {
        return [];
      }
    },
    ..._defaults(options, { ...defaultOptions }),
  });
}

export function useGloabalEsims(options: EsimsQueryOptions = defaultOptions) {
  return useQuery<CataloguePlan[]>({
    queryKey: emisQueryKeys.esimsByGlobal("GLOBAL"),
    queryFn: async () => {
      try {
        const response = await getPlans({ serviceRegionCode: "GLOBAL" });
        return response.plans;
      } catch {
        return [];
      }
    },
    ..._defaults(options, { ...defaultOptions }),
  });
}

export function useCustomEsims(options: EsimsQueryOptions = defaultOptions) {
  return useQuery<CataloguePlan[]>({
    queryKey: emisQueryKeys.esimsByCustom("CUSTOM_REGIONAL"),
    queryFn: async () => {
      try {
        const response = await getPlans({ serviceRegionCode: "CUSTOM_REGIONAL" });
        return response.plans;
      } catch {
        return [];
      }
    },
    ..._defaults(options, { ...defaultOptions }),
  });
}
