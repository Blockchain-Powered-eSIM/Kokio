import type { CataloguePlan } from "@/utils/bff/catalogue";

type NetworkPlan = Pick<CataloguePlan, "coverageType" | "countryWiseNetworkCoverages">;

function networkNames(plan: NetworkPlan, countryCode: string): string[] {
  if (plan.coverageType !== "LOCAL") return [];
  const target = countryCode.toLowerCase();
  const entry = plan.countryWiseNetworkCoverages?.find(
    (c) => c.countryCode?.toLowerCase() === target,
  );
  const names: string[] = [];
  for (const n of entry?.networks ?? []) {
    const name = n.name?.trim();
    if (name) names.push(name);
  }
  return names;
}

function dedupeCaseInsensitive(names: string[]): string[] {
  const seen = new Map<string, string>();
  for (const name of names) {
    const key = name.toLowerCase();
    if (!seen.has(key)) seen.set(key, name);
  }
  return [...seen.values()];
}

/**
 * A plan's full network coverage for the country, as one label - e.g. India
 * has a good-coverage group ("Airtel, Bharti Airtel, Jio, Vodafone Idea") and
 * a separate, worse one ("VI India"). Sorted so two plans with the same real
 * coverage but a differently-ordered backend array (no ordering guarantee -
 * see the BFF schema) still collapse into the same group instead of
 * producing duplicate chips for what's really one coverage tier.
 */
function networkGroupLabel(plan: NetworkPlan, countryCode: string): string | null {
  const names = dedupeCaseInsensitive(networkNames(plan, countryCode));
  if (names.length === 0) return null;
  return names.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" })).join(", ");
}

/**
 * One option per distinct network-coverage group actually present among the
 * given LOCAL plans for this country - never individual carrier names, since
 * a user is choosing a coverage tier (which set of networks they'll roam on),
 * not a single carrier out of a plan's combined list.
 * Network data exists only on LOCAL plans. Callers should hide the filter UI when options.length <= 1.
 */
export function getNetworkOptions(plans: CataloguePlan[] | undefined, countryCode: string): string[] {
  const byKey = new Map<string, string>();
  for (const plan of plans ?? []) {
    const label = networkGroupLabel(plan, countryCode);
    if (!label) continue;
    const key = label.toLowerCase();
    if (!byKey.has(key)) byKey.set(key, label);
  }
  return [...byKey.values()].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
}

/** Null network returns plans unchanged; otherwise keeps only plans whose full network-coverage group matches. */
export function filterPlansByNetwork<T extends NetworkPlan>(
  plans: T[],
  countryCode: string,
  network: string | null,
): T[] {
  if (network === null) return plans;
  const target = network.trim().toLowerCase();
  return plans.filter((plan) => networkGroupLabel(plan, countryCode)?.toLowerCase() === target);
}
