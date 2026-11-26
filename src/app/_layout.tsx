// Add global shims
import "react-native-get-random-values";
import "@/utils/nativeRuntimeSetup";

import { useFonts } from "expo-font";
import { Stack, useRouter, usePathname } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { View } from "react-native";
import { useEffect, useRef, useState } from "react";
import "react-native-reanimated";
import _isNull from "lodash/isNull";
import "../../global.css";

import useBootstrap from "@/lib/bootstrap/use-bootstrap";
import { ROUTE_NAMES } from "@/lib/constants/routes";
import { Providers } from "@/providers";
import FullScreenLoader from "@/components/ui/FullScreenLoader";
import { AuthenticationModal } from "@/components/AuthenticationModal";
import { StepUpPromptModal } from "@/components/StepUpPromptModal";
import { ServiceStatusBanner } from "@/components/ServiceStatusBanner";
import { setUnauthenticatedHandler } from "@/lib/api/http-client";
import { useAuthStore } from "@/lib/auth/auth-store";
import { isReturningDevice, runMainnetCutoverIfNeeded } from "@/lib/auth/mainnet-cutover-reset";
import { shouldShowWelcomeBack } from "@/lib/auth/returning-user-probe";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { useConnectivity, useOfflineRedirect } from "@/features/offline/hooks/use-offline-redirect";

// Prevent splash screen from auto-hiding
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const router = useRouter();
  const pathname = usePathname();

  const [bootstrapDismissed, setBootstrapDismissed] = useState(false);
  const [resetReady, setResetReady] = useState(false);
  const [showWelcomeBack, setShowWelcomeBack] = useState(false);
  const welcomeBackRedirectedRef = useRef(false);
  const [loaded] = useFonts({
    "Lexend-Light": require("@/assets/fonts/Lexend-Light.ttf"),
    Lexend: require("@/assets/fonts/Lexend-Regular.ttf"),
    "Lexend-Medium": require("@/assets/fonts/Lexend-Medium.ttf"),
    "Lexend-SemiBold": require("@/assets/fonts/Lexend-SemiBold.ttf"),
    "Lexend-Bold": require("@/assets/fonts/Lexend-Bold.ttf"),
    "Lexend-Black": require("@/assets/fonts/Lexend-Black.ttf"),
  });

  const { isLoading, error: bootstrapError, refresh: refreshBootstrap } = useBootstrap();

  const { isConnected, confirmedOffline, pathnameRef } = useConnectivity();

  // Runs once before anything else touches SecureStore: on a device upgrading from
  // a testnet build, wipes the now-meaningless local identity/wallet state.
  useEffect(() => {
    isReturningDevice()
      .then((returningDevice) => runMainnetCutoverIfNeeded(returningDevice))
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

  useOfflineRedirect(confirmedOffline, showLoader, pathnameRef);

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
