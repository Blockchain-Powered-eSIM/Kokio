import { useEffect } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { getWcSignClient } from "@/utils/walletconnect/signClient";

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
        if (__DEV__) console.error("[WC] pair failed:", err);
        router.replace("/");
      });
  }, []);

  return null;
}
