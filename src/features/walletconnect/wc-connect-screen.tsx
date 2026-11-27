import { useEffect } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { getWcSignClient } from "./walletconnect-client";
import { logger } from "@/lib/logger";

// Handles deep-links of the form kokio://wc-connect?uri=wc%3ATOPIC%402%3F...
// Passes the decoded WC pairing URI to the sign client, which fires
// session_proposal and navigates to /wc-session.
export default function WcConnectScreen() {
  const { uri } = useLocalSearchParams<{ uri: string }>();

  useEffect(() => {
    if (!uri) {
      router.replace("/");
      return;
    }
    getWcSignClient()
      .then((client) => client.pair({ uri: decodeURIComponent(uri) }))
      .catch((err) => {
        logger.error('WC_PAIR_FAILED', { err });
        router.replace("/");
      });
  }, [uri]);

  return null;
}
