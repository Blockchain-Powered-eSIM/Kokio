import type { CataloguePlan } from "@/utils/bff/catalogue";

/** Appends BACKUP plans from an includeBackup response after the ACTIVE list, skipping duplicate catalogue ids. */
export function mergeBackupPlans(
  active: CataloguePlan[] | undefined,
  backupResponse: CataloguePlan[] | undefined,
): { plans: CataloguePlan[]; addedCount: number } {
  const base = active ?? [];
  const seen = new Set(base.map((p) => p.catalogueId));
  const added: CataloguePlan[] = [];

  for (const plan of backupResponse ?? []) {
    if (plan.planStatus !== "BACKUP" || seen.has(plan.catalogueId)) continue;
    seen.add(plan.catalogueId);
    added.push(plan);
  }

  return { plans: [...base, ...added], addedCount: added.length };
}
