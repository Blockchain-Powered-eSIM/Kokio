// Add global shims
import "react-native-get-random-values";
import "@/utils/nativeRuntimeSetup";

import { useFonts } from "expo-font";
import { Stack, useRouter, usePathname } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { View } from "react-native";
import { useCallback, useEffect, useRef, useState } from "react";
import "react-native-reanimated";
import _isNull from "lodash/isNull";
import NetInfo, { type NetInfoState } from "@react-native-community/netinfo";
import "../global.css";

import useBootstrap from "@/hooks/useBootstrap";
import { ROUTE_NAMES } from "@/constants/route.constants";
import { Providers } from "@/providers";
import FullScreenLoader from "@/components/ui/FullScreenLoader";
import { AuthenticationModal } from "@/components/AuthenticationModal";
import { StepUpPromptModal } from "@/components/StepUpPromptModal";
import { ServiceStatusBanner } from "@/components/ServiceStatusBanner";
import { setUnauthenticatedHandler } from "@/services/httpService";
import { useAuthStore } from "@/stores/authStore";
import { runSdkV3MigrationIfNeeded } from "@/utils/auth/sdkV3Reset";
import { isReturningDevice, runMainnetCutoverIfNeeded } from "@/utils/auth/mainnetCutoverReset";
import { shouldShowWelcomeBack } from "@/utils/auth/returningUserProbe";
import { ThemeProvider } from "@/contexts/ThemeContext";
import {
  getSkipNextOfflineRedirect,
  isOfflinePath,
  leaveOfflineScreen,
  setSkipNextOfflineRedirect,
} from "@/utils/offlineRedirectFlag";

// Prevent splash screen from auto-hiding
SplashScreen.preventAutoHideAsync();

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

export default function RootLayout() {
  const router = useRouter();
  const pathname = usePathname();

  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [bootstrapDismissed, setBootstrapDismissed] = useState(false);
  const [resetReady, setResetReady] = useState(false);
  const [showWelcomeBack, setShowWelcomeBack] = useState(false);
  const welcomeBackRedirectedRef = useRef(false);
  const [loaded] = useFonts({
    "Lexend-Light": require("../assets/fonts/Lexend-Light.ttf"),
    Lexend: require("../assets/fonts/Lexend-Regular.ttf"),
    "Lexend-Medium": require("../assets/fonts/Lexend-Medium.ttf"),
    "Lexend-SemiBold": require("../assets/fonts/Lexend-SemiBold.ttf"),
    "Lexend-Bold": require("../assets/fonts/Lexend-Bold.ttf"),
    "Lexend-Black": require("../assets/fonts/Lexend-Black.ttf"),
  });

  const { isLoading, error: bootstrapError, refresh: refreshBootstrap } = useBootstrap();

  // Use refs to avoid recreating the NetInfo listener on every pathname change
  const pathnameRef = useRef(pathname);
  const [confirmedOffline, setConfirmedOffline] = useState(false);
  const confirmedOfflineRef = useRef(false);
  const offlineTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasReadingRef = useRef(false);
  const offlinePushedRef = useRef(false);

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
    // router is a stable singleton reference from expo-router
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // Runs once before anything else touches SecureStore: on a device upgrading from
  // a pre-kokio-sdk-v3 build, wipes the now-meaningless local identity/wallet state.
  // runMainnetCutoverIfNeeded is the same idiom for the future testnet -> mainnet
  // cutover — currently a no-op until MAINNET_CUTOVER_ENABLED flips true.
  useEffect(() => {
    isReturningDevice()
      .then((returningDevice) =>
        runSdkV3MigrationIfNeeded().then(() => runMainnetCutoverIfNeeded(returningDevice)),
      )
      .then(() => shouldShowWelcomeBack())
      .then(setShowWelcomeBack)
      .finally(() => setResetReady(true));
  }, []);

  // Rehydrate persisted tokens from SecureStore and wire the unauthenticated
  // redirect handler so httpService can navigate on refresh failure.
  useEffect(() => {
    if (!resetReady) return;
    useAuthStore.getState().loadPersistedTokens();
    setUnauthenticatedHandler(() => router.replace("/" as any));
    // router is a stable singleton reference from expo-router
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetReady]);

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

  // Hide splash screen after fonts and bootstrap complete
  useEffect(() => {
    if (loaded && !isLoading) {
      SplashScreen.hideAsync();
    }
  }, [loaded, isLoading]);

  const showLoader = !bootstrapDismissed && (!resetReady || !loaded || _isNull(isConnected) || isLoading || !!bootstrapError);

  // One-shot redirect; the ref latch stops it firing again on later re-renders.
  useEffect(() => {
    if (showLoader || !showWelcomeBack || welcomeBackRedirectedRef.current) return;
    welcomeBackRedirectedRef.current = true;
    router.replace(ROUTE_NAMES.WELCOME_BACK as any);
    // router is a stable singleton reference from expo-router
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showLoader, showWelcomeBack]);

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
    // router is a stable singleton reference from expo-router
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [confirmedOffline, showLoader]);

  const inner =
    showLoader ? (
      <FullScreenLoader
        error={bootstrapError}
        onRetry={bootstrapError ? refreshBootstrap : undefined}
        onContinue={bootstrapError ? () => setBootstrapDismissed(true) : undefined}
      />
    ) : (
      <Providers>
      <ServiceStatusBanner />
      <View style={{ flex: 1 }}>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="+not-found" />
          <Stack.Screen name="Offline" options={{ headerShown: false, gestureEnabled: false }} />
          <Stack.Screen name="welcome-back" options={{ headerShown: false, gestureEnabled: false }} />
          <Stack.Screen name="moonpay-return" options={{ headerShown: false }} />
          <Stack.Screen name="wc-connect" options={{ headerShown: false }} />
          <Stack.Screen name="wc-session" options={{ headerShown: false, presentation: "modal" }} />
          <Stack.Screen name="coverage-modal" options={{ headerShown: false, presentation: "modal" }} />
          <Stack.Screen name="privacy-policy" options={{ headerShown: false, presentation: "modal" }} />
          <Stack.Screen name="refer-and-earn" options={{ headerShown: false, presentation: "modal" }} />
        </Stack>
      </View>
      {pathname !== `/${ROUTE_NAMES.WELCOME_BACK}` && <AuthenticationModal />}
      <StepUpPromptModal />
    </Providers>
    );

  return <ThemeProvider>{inner}</ThemeProvider>;
}
