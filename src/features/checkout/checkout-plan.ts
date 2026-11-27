import type { Esim } from "@/components/ui/esim-item";

let last: { raw: string; plan: Esim | null } | undefined;

/**
 * Reads the plan passed to checkout as the `item` route param (a JSON string).
 * The screen and its header both call this; the last result is kept so the string is parsed once.
 */
export function parseCheckoutPlan(raw: unknown): Esim | null {
  if (typeof raw !== "string") return (raw as Esim | undefined) ?? null;
  if (last?.raw !== raw) {
    let plan: Esim | null = null;
    try {
      plan = JSON.parse(raw) as Esim;
    } catch {}
    last = { raw, plan };
  }
  return last.plan;
}
