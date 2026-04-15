import { useQuery } from "@tanstack/react-query";

import _defaults from "lodash/defaults";
import _find from "lodash/find";
import _map from "lodash/map";
import _get from "lodash/get";
import _filter from "lodash/filter";

import { fetchEsimsCatalogue } from "@/services/esims";

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
          const payload = { serviceRegionCode };
          const response = await fetchEsimsCatalogue(payload);
          const allPlans = _get(response, "data.plans") || [];
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
          const payload = { serviceRegionCode: region };
          const response = await fetchEsimsCatalogue(payload);
          const allPlans = _get(response, "data.plans") || [];
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
          const payload = { serviceRegionCode: "GLOBAL" };
          const response = await fetchEsimsCatalogue(payload);
          const allPlans = _get(response, "data.plans") || [];
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
          const payload = { serviceRegionCode: "CUSTOM_REGIONAL" };
          const response = await fetchEsimsCatalogue(payload);
          const allPlans = _get(response, "data.plans") || [];
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