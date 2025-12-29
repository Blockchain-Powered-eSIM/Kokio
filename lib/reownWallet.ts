// lib/reownWallet.ts
import { WalletKit } from "@reown/walletkit";
import { Core } from "@walletconnect/core";

let walletKitInstance: WalletKit | null = null;

export async function getWalletKit(): Promise<WalletKit> {
  if (walletKitInstance) return walletKitInstance;

  const core = new Core({
    projectId: process.env.PROJECT_ID || "cdb9a04ee1f6e52d27f799995d9361e2",
  });

  walletKitInstance = await WalletKit.init({
    core,
    metadata: {
      name: "test",
      description: "WalletKit Integration",
      url: "'https://reown.com/walletkit'",
      icons: [],
    },
  });

  return walletKitInstance;
}
