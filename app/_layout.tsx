// Polyfills for Node.js modules in React Native
import "react-native-get-random-values";
import { Buffer } from "@craftzdog/react-native-buffer";
(global as any).Buffer = Buffer;

import { useFonts } from "expo-font";
import { Stack, useRouter, usePathname } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect, useState } from "react";
import "react-native-reanimated";
import "../global.css";
import { ToastProvider } from "@/contexts/ToastContext";
import useBootstrap from "@/hooks/useBootstrap";
import FullScreenLoader from "@/components/ui/FullScreenLoader";
import NetInfo from "@react-native-community/netinfo";
import {
  getSkipNextOfflineRedirect,
  setSkipNextOfflineRedirect,
} from "@/utils/offlineRedirectFlag";
import { useTurnkey } from "@turnkey/sdk-react-native";
import { useKokio } from "@/hooks/useKokio";
import { isSupported } from "@turnkey/react-native-passkey-stamper";
import { Providers } from "@/providers";

// Prevent splash screen from auto-hiding
SplashScreen.preventAutoHideAsync();

// Separate component for authentication logic that can use Turnkey hooks
function AuthenticatedLayout() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, session } = useTurnkey();
  const { kokio } = useKokio();

  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [isNavigationReady, setIsNavigationReady] = useState(false);

  // Wait for navigation to be ready
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsNavigationReady(true);
    }, 100); // Small delay to ensure navigation is ready

    return () => clearTimeout(timer);
  }, []);

  // Check authentication status
  useEffect(() => {
    if (!isNavigationReady) return;

    const checkAuth = async () => {
      try {
        // Check if passkeys are supported
        if (!isSupported()) {
          console.error("Passkeys are not supported on this device");
          // Redirect to auth screen for unsupported devices
          router.replace("/auth");
          return;
        }

        // Check if user is authenticated
        if (!user || !session) {
          // Check if user data exists in secure store (indicating previous signup)
          if (!kokio.userData) {
            // First time user - redirect to signup
            router.replace("/auth");
          } else {
            // Returning user - redirect to login
            router.replace("/auth");
          }
        } else {
          // User is authenticated - allow access to main app
          if (pathname === "/auth") {
            router.replace("/(tabs)");
          }
        }
      } catch (error) {
        console.error("Auth check error:", error);
        // Only navigate if navigation is ready and we're not already on auth page
        if (isNavigationReady && pathname !== "/auth") {
          router.replace("/auth");
        }
      } finally {
        setIsAuthChecking(false);
      }
    };

    checkAuth();
  }, [user, session, kokio.userData, pathname, isNavigationReady]);

  return null; // This component only handles auth logic, no UI
}

export default function RootLayout() {
  const router = useRouter();
  const pathname = usePathname();
  const [isConnected, setIsConnected] = useState(true);
  const [loaded] = useFonts({
    "Lexend-Light": require("../assets/fonts/Lexend-Light.ttf"),
    Lexend: require("../assets/fonts/Lexend-Regular.ttf"),
    "Lexend-Medium": require("../assets/fonts/Lexend-Medium.ttf"),
    "Lexend-SemiBold": require("../assets/fonts/Lexend-SemiBold.ttf"),
    "Lexend-Bold": require("../assets/fonts/Lexend-Bold.ttf"),
    "Lexend-Black": require("../assets/fonts/Lexend-Black.ttf"),
  });

  const { isLoading } = useBootstrap();

  // Initial connectivity check
  useEffect(() => {
    NetInfo.fetch().then((state) => {
      const online = !!state.isConnected && !!state.isInternetReachable;
      setIsConnected(online);
    });
  }, []);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const online = !!state.isConnected && !!state.isInternetReachable;
      setIsConnected(online);

      if (!online && !getSkipNextOfflineRedirect() && pathname !== "/Offline") {
        router.replace("/Offline");
      }

      // Once back online, reset the flag
      if (online) {
        setSkipNextOfflineRedirect(false);
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
  if (!loaded || isLoading) {
    return <FullScreenLoader />;
  }

  return (
    <Providers>
      <AuthenticatedLayout />
      <ToastProvider>
        <Stack>
          <Stack.Screen name="auth" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="+not-found" />
          <Stack.Screen name="Offline" options={{ headerShown: false }} />
        </Stack>
      </ToastProvider>
    </Providers>
  );
}
