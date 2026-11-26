import { useEffect, useRef, useState } from "react";
import * as SecureStore from "expo-secure-store";
import { DEVICE_WALLET_ADDRESS_KEY } from "@/lib/storage/keys";

/**
 * Whether this device already finished passkey setup, so the auth sheet can show a single Log In
 * button instead of the New/Existing choice. null until the one-off SecureStore check resolves.
 */
export function useIsReturningUser(deviceWalletAddress: string) {
  const [isReturningUser, setIsReturningUser] = useState<boolean | null>(
    deviceWalletAddress ? true : null
  );
  // Once we've established the truth once (cold-launch SecureStore check, or
  // kokio context already had an address), deviceWalletAddress becoming
  // falsy is a deliberate "Logout and Clear Data", so trust it immediately
  // instead of re-checking SecureStore, which would briefly show the stale
  // "Log In" button before flipping to the New/Existing choice.
  const hasResolvedOnce = useRef(!!deviceWalletAddress);

  useEffect(() => {
    if (deviceWalletAddress) {
      hasResolvedOnce.current = true;
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsReturningUser(true);
      return;
    }
    if (hasResolvedOnce.current) {
      setIsReturningUser(false);
      return;
    }
    let cancelled = false;
    SecureStore.getItemAsync(DEVICE_WALLET_ADDRESS_KEY).then((stored) => {
      if (!cancelled) {
        hasResolvedOnce.current = true;
        setIsReturningUser(!!stored);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [deviceWalletAddress]);

  return isReturningUser;
}
