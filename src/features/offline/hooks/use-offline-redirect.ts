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
    setSkipNextOfflineRedirect(false);
    updateConfirmedOffline(false);
  }, [updateConfirmedOffline]);

  const applyReading = useCallback(
    (online: boolean) => {
      const isFirstReading = !hasReadingRef.current;
      hasReadingRef.current = true;

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

  // The app opens without waiting for this first reading; an offline answer
  // then redirects to the Offline screen.
  useEffect(() => {
    NetInfo.fetch().then((state) => {
      const online = toOnline(state);
      if (online !== null) applyReading(online);
    });
  }, [applyReading]);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const online = toOnline(state);
      // An unknown reading changes nothing; only a definite one counts.
      if (online === null) return;
      applyReading(online);
    });
    return () => {
      unsubscribe();
      if (offlineTimerRef.current) clearTimeout(offlineTimerRef.current);
    };
  }, [applyReading]);

  return { confirmedOffline, pathnameRef };
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
    router.push(`/${ROUTE_NAMES.OFFLINE}`);
  }, [confirmedOffline, showLoader, pathnameRef]);
}
