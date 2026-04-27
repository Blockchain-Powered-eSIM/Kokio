import { useQuery } from "@tanstack/react-query";

import _defaults from "lodash/defaults";
import _find from "lodash/find";
import _map from "lodash/map";
import _filter from "lodash/filter";

import { getPlans } from "@/utils/bff/catalogue";

const defaultOptions = {
  retry: false,
  cacheTime: 0,
};

export const emisQueryKeys = {
  all: ["esims"],
  esimsByCountry: (item) => [...emisQueryKeys.all, "byCountry", item],
  esimsByRegion: (item) => [...emisQueryKeys.all, "byRegion", item],
  esimsByGlobal: (item) => [...emisQueryKeys.all, "byGlobal", item],
  esimsByCustom: (item) => [...emisQueryKeys.all, "byCustom", item],
};

function useEsimsByCountry(serviceRegionCode, options = defaultOptions) {
  try {
    const result = useQuery({
      queryKey: emisQueryKeys.esimsByCountry(serviceRegionCode),
      queryFn: async () => {
        try {
          const response = await getPlans({ serviceRegionCode });
          const allPlans = response.plans;
          return allPlans;
        } catch (err) {
          return [];
        }
      },
      ..._defaults(options, { ...defaultOptions }),
    });

    return result;
  } catch (err) {
    console.log({ err });
  }
}

function useEsimsByRegion(region, options = defaultOptions) {
  try {
    const result = useQuery({
      queryKey: emisQueryKeys.esimsByRegion(region),
      queryFn: async () => {
        try {
          const response = await getPlans({ serviceRegionCode: region });
          const allPlans = response.plans;
          return allPlans;
        } catch (err) {
          return [];
        }
      },
      ..._defaults(options, { ...defaultOptions }),
    });

    return result;
  } catch (err) {
    console.log({ err });
  }
}

function useGloabalEsims(options = defaultOptions) {
  try {
    const result = useQuery({
      queryKey: emisQueryKeys.esimsByGlobal("GLOBAL"),
      queryFn: async () => {
        try {
          const response = await getPlans({ serviceRegionCode: "GLOBAL" });
          const allPlans = response.plans;
          return allPlans;
        } catch (err) {
          return [];
        }
      },
      ..._defaults(options, { ...defaultOptions }),
    });

    return result;
  } catch (err) {
    console.log({ err });
  }
}

function useCustomEsims(options = defaultOptions) {
  try {
    const result = useQuery({
      queryKey: emisQueryKeys.esimsByCustom("CUSTOM_REGIONAL"),
      queryFn: async () => {
        try {
          const response = await getPlans({ serviceRegionCode: "CUSTOM_REGIONAL" });
          const allPlans = response.plans;
          return allPlans;
        } catch (err) {
          return [];
        }
      },
      ..._defaults(options, { ...defaultOptions }),
    });

    return result;
  } catch (err) {
    console.log({ err });
  }
}

export { useEsimsByCountry, useEsimsByRegion, useGloabalEsims, useCustomEsims};