import { useState, useCallback, useEffect, useRef } from "react";
import { AppState } from "react-native";
import * as Linking from "expo-linking";
import { getSignClient } from "@/lib/reownWallet";
import { WC_BASE_SEPOLIA } from "@/constants/general.constants";

export const useWalletConnect = () => {
  const [isConnecting, setIsConnecting] = useState(false);
  const [externalSession, setExternalSession] = useState<any>(null);
  const [externalAddress, setExternalAddress] = useState<string>("");
  const [payViaExternalWallet, setPayViaExternalWallet] = useState(false);
  const isConnectingRef = useRef(false);

  // When user returns to app without approving, reset connecting state
  useEffect(() => {
    const sub = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active" && isConnectingRef.current) {
        setIsConnecting(false);
        setPayViaExternalWallet(false);
        isConnectingRef.current = false;
      }
    });
    return () => sub.remove();
  }, []);

  // Sync session on mount
  useEffect(() => {
    const syncSession = async () => {
      try {
        const signClient = await getSignClient();
        const sessions = signClient.session.getAll();
        if (sessions.length > 0) {
          const lastSession = sessions[sessions.length - 1];
          setExternalSession(lastSession);
          setExternalAddress(lastSession.namespaces.eip155.accounts[0].split(":")[2]);
          setPayViaExternalWallet(true);
        }
      } catch (error) {
        console.error("Failed to sync session:", error);
      }
    };
    syncSession();
  }, []);

  const disconnectExternalWallet = useCallback(async () => {
    try {
      const signClient = await getSignClient();
      const sessions = signClient.session.getAll();
      
      // Clear all sessions to ensure clean state
      for (const session of sessions) {
        await signClient.disconnect({
          topic: session.topic,
          reason: { code: 6000, message: "User opted out" },
        }).catch(() => {});
      }
    } finally {
      setExternalSession(null);
      setExternalAddress("");
      setPayViaExternalWallet(false);
    }
  }, []);

  const connectExternalWallet = useCallback(async () => {
    try {
      setIsConnecting(true);
      isConnectingRef.current = true;
      const signClient = await getSignClient();

      const { uri, approval } = await signClient.connect({
        requiredNamespaces: {
          eip155: {
            chains: [WC_BASE_SEPOLIA],
            methods: ["personal_sign", "eth_sendTransaction"],
            events: ["accountsChanged", "chainChanged"],
          },
        },
      });

      if (uri) {
        await Linking.openURL(uri);
      }

      const session = await approval();
      setExternalSession(session);
      setExternalAddress(session.namespaces.eip155.accounts[0].split(":")[2]);
      setPayViaExternalWallet(true);
      
    } catch (err) {
      console.error("Connection failed:", err);
      setPayViaExternalWallet(false);
    } finally {
      setIsConnecting(false);
      isConnectingRef.current = false;
    }
  }, []);

  return {
    isConnecting,
    externalSession,
    externalAddress,
    payViaExternalWallet,
    setPayViaExternalWallet,
    connectExternalWallet,
    disconnectExternalWallet
  };
};
