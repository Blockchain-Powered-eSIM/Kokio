import { useQuery } from "@tanstack/react-query";

import _defaults from "lodash/defaults";
import _find from "lodash/find";
import _map from "lodash/map";

import { fetchEsimsByCountry } from "@/services/esims";

const defaultOptions = {
  retry: false,
  cacheTime: 0,
};

export const emisQueryKeys = {
  all: ["esims"],
  esimsByCountry: (country) => [...emisQueryKeys.all, "byCountry", country],
  esimsByRegion: (country) => [...emisQueryKeys.all, "byRegion", country],
};

function useEsimsByCountry(country, options = defaultOptions) {
  const result = useQuery({
    queryKey: emisQueryKeys.esimsByCountry(country),
    queryFn: async () => {
      const payload = { country };
      const response = await fetchEsimsByCountry(payload);
      return response;
    },
    ..._defaults(options, { ...defaultOptions }),
  });

  return result;
}

function useEsimsByRegion(region, options = defaultOptions) {
  const result = useQuery({
    queryKey: emisQueryKeys.esimsByCountry(region),
    queryFn: async () => {
      const payload = { region };
      const response = await fetchEsimsByCountry(payload);
      return response;
    },
    ..._defaults(options, { ...defaultOptions }),
  });

  return result;
}

export { useEsimsByCountry, useEsimsByRegion };
