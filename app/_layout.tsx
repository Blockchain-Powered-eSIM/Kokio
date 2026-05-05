// Add global shims
import "react-native-get-random-values";
import "@ethersproject/shims";
import { install as installQuickCrypto } from "react-native-quick-crypto";

import { useFonts } from "expo-font";
import { Stack, useRouter, usePathname } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { View } from "react-native";
import { useEffect, useRef, useState } from "react";
import "react-native-reanimated";
import _isNull from "lodash/isNull";
import AsyncStorage from "@react-native-async-storage/async-storage";
import "../global.css";
import useBootstrap from "@/hooks/useBootstrap";
import FullScreenLoader from "@/components/ui/FullScreenLoader";
import NetInfo from "@react-native-community/netinfo";
import {
  getSkipNextOfflineRedirect,
  setSkipNextOfflineRedirect,
} from "@/utils/offlineRedirectFlag";
import { ROUTE_NAMES } from "@/constants/route.constants";
import { Providers } from "@/providers";
import { AuthenticationModal } from "@/components/AuthenticationModal";
import { StepUpPromptModal } from "@/components/StepUpPromptModal";
import { ServiceStatusBanner } from "@/components/ServiceStatusBanner";
import { setUnauthenticatedHandler } from "@/services/httpService";
import { useAuthStore } from "@/stores/authStore";
import { THEME_STORAGE_KEY, applyTheme } from "@/constants/Colors";

// Polyfill global.crypto.subtle for jose / DPoP key generation.
// index.js is not used when "main" = "expo-router/entry", so this must live here.
installQuickCrypto();

// Prevent splash screen from auto-hiding
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const router = useRouter();
  const pathname = usePathname();

  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [themeLoaded, setThemeLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(THEME_STORAGE_KEY).then((val) => {
      applyTheme(val !== "light");
      setThemeLoaded(true);
    });
  }, []);
  const [loaded] = useFonts({
    "Lexend-Light": require("../assets/fonts/Lexend-Light.ttf"),
    Lexend: require("../assets/fonts/Lexend-Regular.ttf"),
    "Lexend-Medium": require("../assets/fonts/Lexend-Medium.ttf"),
    "Lexend-SemiBold": require("../assets/fonts/Lexend-SemiBold.ttf"),
    "Lexend-Bold": require("../assets/fonts/Lexend-Bold.ttf"),
    "Lexend-Black": require("../assets/fonts/Lexend-Black.ttf"),
  });

  const { isLoading } = useBootstrap();

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
  }, []);

  // Initial connectivity check
  useEffect(() => {
    NetInfo.fetch().then((state) => {
      if (_isNull(state.isInternetReachable)) {
        // Network state is still being determined
        setIsConnected(null);
      } else {
        const online = !!state.isConnected && !!state.isInternetReachable;
        setIsConnected(online);
      }
    });
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
  }, []);

  // Hide splash screen after fonts and bootstrap complete
  useEffect(() => {
    if (loaded && !isLoading) {
      SplashScreen.hideAsync();
    }
  }, [loaded, isLoading]);

  // Wait until ready
  if (!loaded || _isNull(isConnected) || !themeLoaded) {
    return <FullScreenLoader />;
  }

  return (
    <Providers>
      <ServiceStatusBanner />
      <View style={{ flex: 1 }}>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="+not-found" />
          <Stack.Screen name="Offline" options={{ headerShown: false }} />
          <Stack.Screen name="moonpay-return" options={{ headerShown: false }} />
        </Stack>
      </View>
      <AuthenticationModal />
      <StepUpPromptModal />
    </Providers>
  );
}
