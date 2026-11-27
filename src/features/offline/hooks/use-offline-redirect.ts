import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { router, usePathname } from "expo-router";
import _isNull from "lodash/isNull";
import NetInfo, { type NetInfoState } from "@react-native-community/netinfo";
import { ROUTE_NAMES } from "@/lib/constants/routes";
import {
  getSkipNextOfflineRedirect,
  isOfflinePath,
  leaveOfflineScreen,
  setSkipNextOfflineRedirect,
} from "../offline-redirect";

// A genuine disconnect (isConnected false) is offline whatever the reachability
// probe says; otherwise null means the probe has not resolved and is unknown.
const toOnline = (state: NetInfoState): boolean | null => {
  if (state.isConnected === false) return false;
  if (_isNull(state.isInternetReachable) || state.isInternetReachable === undefined) return null;
  return !!state.isConnected && state.isInternetReachable;
};

// Reachability blips (probe timeouts, network handoffs, returning from the
// background) clear on their own within seconds; only redirect if still offline.
const OFFLINE_CONFIRM_DELAY_MS = 3000;

/** Tracks whether the device is online, with a short debounce before confirming it is offline. */
export function useConnectivity() {
  const pathname = usePathname();
  const [isConnected, setIsConnected] = useState<boolean | null>(null);

  // Use refs to avoid recreating the NetInfo listener on every pathname change
  const pathnameRef = useRef(pathname);
  const [confirmedOffline, setConfirmedOffline] = useState(false);
  const confirmedOfflineRef = useRef(false);
  const offlineTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasReadingRef = useRef(false);

  const updateConfirmedOffline = useCallback((value: boolean) => {
    confirmedOfflineRef.current = value;
    setConfirmedOffline(value);
  }, []);

  const markOnline = useCallback(() => {
    if (offlineTimerRef.current) {
      clearTimeout(offlineTimerRef.current);
      offlineTimerRef.current = null;
    }
    setIsConnected(true);
    setSkipNextOfflineRedirect(false);
    updateConfirmedOffline(false);
  }, [updateConfirmedOffline]);

  const applyReading = useCallback(
    (online: boolean) => {
      const isFirstReading = !hasReadingRef.current;
      hasReadingRef.current = true;
      setIsConnected(online);

      if (online) {
        markOnline();
        return;
      }

      if (confirmedOfflineRef.current || offlineTimerRef.current) return;

      // Nothing to lose on a cold start, so skip the debounce there.
      if (isFirstReading) {
        updateConfirmedOffline(true);
        return;
      }

      offlineTimerRef.current = setTimeout(() => {
        offlineTimerRef.current = null;
        NetInfo.refresh()
          .then((fresh) => {
            const stillOnline = toOnline(fresh);
            if (stillOnline === false) updateConfirmedOffline(true);
            else if (stillOnline) markOnline();
          })
          .catch(() => {});
      }, OFFLINE_CONFIRM_DELAY_MS);
    },
    [updateConfirmedOffline, markOnline],
  );

  useEffect(() => {
    pathnameRef.current = pathname;
    // Covers a reconnect landing in the gap between the push dispatch and the
    // pathname update, which would otherwise leave Offline on screen while online.
    if (isOfflinePath(pathname) && !confirmedOfflineRef.current) {
      leaveOfflineScreen(router);
    }
  }, [pathname]);

  useEffect(() => {
    // isInternetReachable can stay null indefinitely on some devices; give up
    // after 6s and assume online so the loader cannot hang. A later definite
    // reading still corrects it.
    const timeoutId = setTimeout(() => setIsConnected((prev) => prev ?? true), 6000);

    NetInfo.fetch().then((state) => {
      const online = toOnline(state);
      if (online === null) return;
      clearTimeout(timeoutId);
      applyReading(online);
    });

    return () => clearTimeout(timeoutId);
  }, [applyReading]);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const online = toOnline(state);
      // Never write an unknown reading back into isConnected: it feeds
      // showLoader, so null would unmount the whole Stack and reset navigation.
      if (online === null) return;
      applyReading(online);
    });
    return () => {
      unsubscribe();
      if (offlineTimerRef.current) clearTimeout(offlineTimerRef.current);
    };
  }, [applyReading]);

  return { isConnected, confirmedOffline, pathnameRef };
}

/**
 * Pushes the Offline screen once offline is confirmed, and leaves it on reconnect.
 * Call it after any other startup redirect so that one runs first.
 */
export function useOfflineRedirect(
  confirmedOffline: boolean,
  showLoader: boolean,
  pathnameRef: RefObject<string>,
) {
  const offlinePushedRef = useRef(false);

  useEffect(() => {
    if (showLoader) return;

    if (!confirmedOffline) {
      offlinePushedRef.current = false;
      if (isOfflinePath(pathnameRef.current)) leaveOfflineScreen(router);
      return;
    }

    if (
      getSkipNextOfflineRedirect() ||
      offlinePushedRef.current ||
      isOfflinePath(pathnameRef.current)
    ) {
      return;
    }
    offlinePushedRef.current = true;
    router.push(ROUTE_NAMES.OFFLINE as any);
  }, [confirmedOffline, showLoader]);
}
