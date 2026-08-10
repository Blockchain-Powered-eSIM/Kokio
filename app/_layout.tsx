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
import NetInfo from "@react-native-community/netinfo";
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
import { ThemeProvider } from "@/contexts/ThemeContext";
import {
  getSkipNextOfflineRedirect,
  setSkipNextOfflineRedirect,
} from "@/utils/offlineRedirectFlag";

// Prevent splash screen from auto-hiding
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const router = useRouter();
  const pathname = usePathname();

  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [bootstrapDismissed, setBootstrapDismissed] = useState(false);
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

  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);

  // Rehydrate persisted tokens from SecureStore and wire the unauthenticated
  // redirect handler so httpService can navigate on refresh failure.
  useEffect(() => {
    useAuthStore.getState().loadPersistedTokens();
    setUnauthenticatedHandler(() => router.replace("/" as any));
    // router is a stable singleton reference from expo-router
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Initial connectivity check
  useEffect(() => {
    let settled = false;

    // On some devices isInternetReachable can stay null indefinitely (the
    // reachability probe never resolves). Without a bound here, _isNull(isConnected)
    // keeps FullScreenLoader up forever. Give up after 6s and assume online —
    // the listener below still corrects this and redirects to Offline if a
    // later reading confirms we're actually offline.
    const timeoutId = setTimeout(() => {
      if (!settled) {
        settled = true;
        setIsConnected(true);
      }
    }, 6000);

    NetInfo.fetch().then((state) => {
      if (settled) return;
      if (_isNull(state.isInternetReachable)) {
        // Network state is still being determined
        setIsConnected(null);
      } else {
        settled = true;
        clearTimeout(timeoutId);
        const online = !!state.isConnected && !!state.isInternetReachable;
        setIsConnected(online);
      }
    });

    return () => clearTimeout(timeoutId);
  }, []);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      let online: boolean | null;

      if (_isNull(state.isInternetReachable)) {
        // Network state is still being determined
        online = null;
      } else {
        online = !!state.isConnected && !!state.isInternetReachable;
      }

      setIsConnected(online);

      // Only redirect to offline if we're definitely offline (not null/unknown)
      if (
        online === false &&
        !getSkipNextOfflineRedirect() &&
        pathnameRef.current !== ROUTE_NAMES.OFFLINE
      ) {
        router?.replace(ROUTE_NAMES.OFFLINE as any);
      }

      if (online) {
        setSkipNextOfflineRedirect(false);

        // If we're on the offline screen and network becomes available, go home
        if (pathnameRef.current === ROUTE_NAMES.OFFLINE) {
          router?.replace("/" as any);
        }
      }
    });
    return () => unsubscribe();
    // router is a stable singleton reference from expo-router
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Hide splash screen after fonts and bootstrap complete
  useEffect(() => {
    if (loaded && !isLoading) {
      SplashScreen.hideAsync();
    }
  }, [loaded, isLoading]);

  const showLoader = !bootstrapDismissed && (!loaded || _isNull(isConnected) || isLoading || !!bootstrapError);

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
          <Stack.Screen name="Offline" options={{ headerShown: false }} />
          <Stack.Screen name="moonpay-return" options={{ headerShown: false }} />
          <Stack.Screen name="wc-connect" options={{ headerShown: false }} />
          <Stack.Screen name="wc-session" options={{ headerShown: false, presentation: "modal" }} />
          <Stack.Screen name="esim-detail" options={{ headerShown: false, presentation: "modal" }} />
          <Stack.Screen name="coverage-modal" options={{ headerShown: false, presentation: "modal" }} />
        </Stack>
      </View>
      <AuthenticationModal />
      <StepUpPromptModal />
    </Providers>
    );

  return <ThemeProvider>{inner}</ThemeProvider>;
}
