import { useQuery, type UseQueryOptions } from "@tanstack/react-query";
import _defaults from "lodash/defaults";

import { getCatalogue } from "@/utils/bff/catalogue";
import type { CataloguePlan } from "@/utils/bff/catalogue";

type EsimsQueryOptions = Omit<UseQueryOptions<CataloguePlan[]>, "queryKey" | "queryFn">;

const STALE_TIME = 5 * 60 * 1000;
const GC_TIME    = 10 * 60 * 1000;

const defaultOptions: EsimsQueryOptions = {
  retry: false,
  staleTime: STALE_TIME,
  gcTime: GC_TIME,
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
      const response = await getCatalogue({ serviceRegionCode });
      return response.plans;
    },
    ..._defaults(options, { ...defaultOptions }),
  });
}

export function useEsimsByRegion(region: string, options: EsimsQueryOptions = defaultOptions) {
  return useQuery<CataloguePlan[]>({
    queryKey: emisQueryKeys.esimsByRegion(region),
    queryFn: async () => {
      const response = await getCatalogue({ serviceRegionCode: region });
      return response.plans;
    },
    ..._defaults(options, { ...defaultOptions }),
  });
}

export function useGloabalEsims(options: EsimsQueryOptions = defaultOptions) {
  return useQuery<CataloguePlan[]>({
    queryKey: emisQueryKeys.esimsByGlobal("GLOBAL"),
    queryFn: async () => {
      const response = await getCatalogue({ serviceRegionCode: "GLOBAL" });
      return response.plans;
    },
    ..._defaults(options, { ...defaultOptions }),
  });
}

export function useCustomEsims(options: EsimsQueryOptions = defaultOptions) {
  return useQuery<CataloguePlan[]>({
    queryKey: emisQueryKeys.esimsByCustom("CUSTOM_REGIONAL"),
    queryFn: async () => {
      const response = await getCatalogue({ serviceRegionCode: "CUSTOM_REGIONAL" });
      return response.plans;
    },
    ..._defaults(options, { ...defaultOptions }),
  });
}
