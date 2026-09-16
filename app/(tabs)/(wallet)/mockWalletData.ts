/**
 * Per-eSIM-wallet balance and top-up-toggle are mocked: kokio-sdk's eSIMWallet
 * surface isn't wired up yet (KokioSDKv3.md Section 1, deferred). The eSIM
 * itself and its wallet address (esimId) are real — only these two numbers
 * are fake, deterministically keyed so they're stable across re-renders
 * instead of a hardcoded lookup table that goes stale as eSIMs are added.
 * Delete this file once Section 1's real reads land.
 */

function hashToUnit(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return hash / 0xffffffff;
}

export function getMockEsimWalletStats(esimId: string): { balance: string; topupAllowed: boolean } {
  const unit = hashToUnit(esimId);
  const balance = (unit * 20).toFixed(2);
  const topupAllowed = unit > 0.35;
  return { balance, topupAllowed };
}
