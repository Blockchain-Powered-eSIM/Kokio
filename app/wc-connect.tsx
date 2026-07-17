import { useEffect } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { getWcSignClient } from "@/utils/walletconnect/signClient";
import { logger } from "@/utils/logger";

// Handles deep-links of the form kokio://wc-connect?uri=wc%3ATOPIC%402%3F...
// Passes the decoded WC pairing URI to the sign client, which fires
// session_proposal and navigates to /wc-session.
export default function WcConnectScreen() {
  const { uri } = useLocalSearchParams<{ uri: string }>();
  const router = useRouter();

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
    // router is a stable singleton reference from expo-router
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uri]);

  return null;
}
