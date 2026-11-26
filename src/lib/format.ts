/** Formats an amount in US cents as dollars, e.g. 1250 -> "$12.50". */
export function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}
