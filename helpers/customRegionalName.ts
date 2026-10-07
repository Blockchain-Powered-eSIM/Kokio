import { COUNTRY_TO_REGIONS } from "@/constants/general.constants";

const REGION_LABEL: Record<string, string> = {
  ASIA: "Asia",
  NORTH_AMERICA: "North America",
  SOUTH_AMERICA: "South America",
  AFRICA: "Africa",
  EUROPE: "Europe",
  MIDDLE_EAST: "Middle East",
  OCEANIA: "Oceania",
  CARIBBEAN_ISLANDS: "Caribbean",
};

const MAX_NAMED_REGIONS = 2;

/**
 * Names a Custom Regional plan after every region its countries fall in,
 * most countries first. Names beyond MAX_NAMED_REGIONS collapse to "+ N more".
 * Returns null when no country maps to a known region.
 */
export function customRegionalName(countryCodes: string[]): string | null {
  const countsByRegion = new Map<string, number>();
  for (const code of new Set(countryCodes.map((c) => c.toUpperCase()))) {
    for (const region of COUNTRY_TO_REGIONS[code] ?? []) {
      countsByRegion.set(region, (countsByRegion.get(region) ?? 0) + 1);
    }
  }

  const ranked = [...countsByRegion.entries()]
    .sort(([, countA], [, countB]) => countB - countA)
    .map(([region]) => REGION_LABEL[region] ?? region);
  if (ranked.length === 0) return null;

  const named = ranked.slice(0, MAX_NAMED_REGIONS).join(" + ");
  const hidden = ranked.length - MAX_NAMED_REGIONS;
  return hidden > 0 ? `${named} + ${hidden} more` : named;
}
