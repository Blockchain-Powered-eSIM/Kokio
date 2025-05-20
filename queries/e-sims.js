import { useQuery } from "@tanstack/react-query";

import _defaults from "lodash/defaults";
import _find from "lodash/find";
import _map from "lodash/map";
import _get from "lodash/get";

import { fetchEsimsCatalogue } from "@/services/esims";

const defaultOptions = {
  retry: false,
  cacheTime: 0,
};

export const emisQueryKeys = {
  all: ["esims"],
  esimsByCountry: (country) => [...emisQueryKeys.all, "byCountry", country],
  esimsByRegion: (country) => [...emisQueryKeys.all, "byRegion", country],
};

function useEsimsByCountry(serviceRegionCode, options = defaultOptions) {
  try {
    const result = useQuery({
      queryKey: emisQueryKeys.esimsByCountry(serviceRegionCode),
      queryFn: async () => {
        const payload = { serviceRegionCode };
        const response = await fetchEsimsCatalogue(payload);
        console.log({ response, d: response?.data });
        return _get(response, "data.plans") || [];
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
        const payload = { region };
        const response = await fetchEsimsCatalogue(payload);
        return _get(response, "data.plans") || [];
      },
      ..._defaults(options, { ...defaultOptions }),
    });

    return result;
  } catch (err) {
    console.log({ err });
  }
}

export { useEsimsByCountry, useEsimsByRegion };
