import * as Clipboard from 'expo-clipboard';

// Clipboard content is often more than just the address - a label, a deep
// link, extra characters picked up from wherever it was copied. Pull the
// address itself out rather than rejecting the whole blob.
const ADDRESS_PATTERN = /0x[0-9a-fA-F]{40}/;

export async function pasteAddressFromClipboard(): Promise<string | null> {
  const text = await Clipboard.getStringAsync();
  const trimmed = text.trim();
  if (!trimmed) return null;
  const match = trimmed.match(ADDRESS_PATTERN);
  return match ? match[0] : trimmed;
}
