import { useQueries } from "@tanstack/react-query";

import { getAllCatalogue } from "@/utils/bff/catalogue";
import { rankPlansForCountries, regionsForCountries, type PlanMatch, type SourcedPlan } from "@/helpers/planCoverage";

const STALE_TIME = 5 * 60 * 1000;
const GC_TIME = 10 * 60 * 1000;

// Special and Global plans can span any countries, so they are always searched;
// region plans are fetched only for regions the selected countries belong to.
export function useMultiCountryPlans(selected: string[]) {
  const regionCodes = regionsForCountries(selected);
  const serviceRegionCodes = selected.length
    ? ["CUSTOM_REGIONAL", "GLOBAL", ...regionCodes]
    : [];

  const queries = useQueries({
    queries: serviceRegionCodes.map((serviceRegionCode) => ({
      queryKey: ["catalogue", "region", serviceRegionCode, {}],
      queryFn: () => getAllCatalogue({ serviceRegionCode }),
      staleTime: STALE_TIME,
      gcTime: GC_TIME,
    })),
  });

  const sources: SourcedPlan[] = queries.flatMap((query, index) =>
    (query.data?.plans ?? []).map((plan) => ({ plan, regionCode: serviceRegionCodes[index] })),
  );

  const matches: PlanMatch[] = rankPlansForCountries(sources, selected);

  return {
    matches,
    isLoading: queries.some((query) => query.isLoading),
    isError: queries.length > 0 && queries.every((query) => query.isError),
    refetch: () => queries.forEach((query) => query.refetch()),
  };
}
