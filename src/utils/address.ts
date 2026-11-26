export function shortenAddress(
  address: string | undefined,
  startLength = 6,
  endLength = 4,
): string {
  if (!address) return "";
  return `${address.slice(0, startLength)}...${address.slice(-endLength)}`;
}

// Display/clipboard only - never used in logic.
export const BASE_ADDRESS_PREFIX = "base:";
export const CHAIN_PREFIXED_ADDRESS = /([a-z][a-z0-9-]*):(0x[0-9a-fA-F]{40})/i;

export function withBasePrefix(address: string | undefined): string {
  return address ? `${BASE_ADDRESS_PREFIX}${address}` : "";
}

// Input rule for address fields: "base:0x…" -> "0x…"
// Any other chain prefix -> null (rejected - transfers only happen on Base)
// no prefix -> returned unchanged.
export function normalizeAddressInput(input: string): string | null {
  const match = input.match(CHAIN_PREFIXED_ADDRESS);
  if (!match) return input;
  return match[1].toLowerCase() === "base" ? match[2] : null;
}
