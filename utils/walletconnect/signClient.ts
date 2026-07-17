// Library specific default import pattern
// eslint-disable-next-line import/no-named-as-default
import SignClient from "@walletconnect/sign-client";
import type { SignClientTypes } from "@walletconnect/types";
import { Config } from "@/appKeys";

export const WC_METADATA: SignClientTypes.Metadata = {
  name: "Kokio",
  description: "eSIM smart wallet",
  url: "https://kokio.app",
  icons: ["https://kokio.app/icon.png"],
  redirect: {
    native: "kokio://",
    universal: "https://kokio.app",
  },
};

type WcClient = Awaited<ReturnType<typeof SignClient.init>>;

let _client: WcClient | null = null;
let _handlersRegistered = false;

// In-flight session proposal while the approval screen is open.
export let pendingProposal: SignClientTypes.EventArguments["session_proposal"] | null = null;

export function setPendingProposal(
  p: SignClientTypes.EventArguments["session_proposal"] | null
): void {
  pendingProposal = p;
}

export function areWcHandlersRegistered(): boolean {
  return _handlersRegistered;
}

export function markWcHandlersRegistered(): void {
  _handlersRegistered = true;
}

export async function getWcSignClient(): Promise<WcClient> {
  if (_client) return _client;
  _client = await SignClient.init({
    projectId: Config.WALLETCONNECT_PROJECT_ID ?? "",
    metadata: WC_METADATA,
  });
  return _client;
}
