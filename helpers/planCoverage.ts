import type { CataloguePlan } from "@/utils/bff/catalogue";
import { COUNTRY_TO_REGIONS } from "@/constants/general.constants";

export interface SourcedPlan {
  plan: CataloguePlan;
  regionCode: string;
}

export interface PlanMatch {
  plan: CataloguePlan;
  coveredCount: number;
}

function coveredCountries(source: SourcedPlan, selected: string[]): string[] {
  const { plan, regionCode } = source;
  switch (plan.coverageType) {
    case "GLOBAL":
      return selected;
    case "REGIONAL":
      return selected.filter((code) => (COUNTRY_TO_REGIONS[code] ?? []).includes(regionCode));
    case "CUSTOM_REGIONAL": {
      const listed = new Set(
        (plan.coverageCountries ?? []).flatMap((c) => (c.countryCode ? [c.countryCode.toUpperCase()] : [])),
      );
      return selected.filter((code) => listed.has(code));
    }
    default:
      return [];
  }
}

/**
 * Plans covering at least one selected country, ranked by how many of them
 * they cover, then by price. Local plans cover a single country and are skipped.
 */
export function rankPlansForCountries(sources: SourcedPlan[], selected: string[]): PlanMatch[] {
  if (selected.length === 0) return [];
  const normalised = selected.map((code) => code.toUpperCase());
  const seen = new Set<string>();
  const matches: PlanMatch[] = [];

  for (const source of sources) {
    const key = source.plan.catalogueId;
    if (seen.has(key)) continue;
    seen.add(key);
    const coveredCount = coveredCountries(source, normalised).length;
    if (coveredCount > 0) matches.push({ plan: source.plan, coveredCount });
  }

  return matches.sort(
    (a, b) => b.coveredCount - a.coveredCount || a.plan.actualSellingPrice - b.plan.actualSellingPrice,
  );
}

export function regionsForCountries(selected: string[]): string[] {
  const codes = new Set(selected.flatMap((code) => COUNTRY_TO_REGIONS[code.toUpperCase()] ?? []));
  return [...codes];
}
