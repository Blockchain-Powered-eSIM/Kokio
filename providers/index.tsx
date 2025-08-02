import { SafeAreaProvider } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { Session, TurnkeyProvider } from "@turnkey/sdk-react-native";
import { AuthRelayProvider } from "./authProvider";
import { KokioProvider } from "./kokioProvider";
import React from "react";
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import {
  TURNKEY_API_URL,
  TURNKEY_PARENT_ORG_ID,
} from "@/constants/passkey.constants";
import { useColorScheme } from "@/hooks/useColorScheme";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
    },
  },
});

export const Providers = ({ children }: { children: React.ReactNode }) => {
  const colorScheme = useColorScheme();

  const sessionConfig = {
    apiBaseUrl: TURNKEY_API_URL,
    organizationId: TURNKEY_PARENT_ORG_ID,
    onSessionCreated: (session: Session) => {
      console.log("Session created", session);
    },
    onSessionCleared: (session: Session) => {
      console.log("Session cleared", session);
    },
  };

  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <SafeAreaProvider>
        <GestureHandlerRootView>
          <QueryClientProvider client={queryClient}>
            <TurnkeyProvider config={sessionConfig}>
              <AuthRelayProvider>
                <KokioProvider>{children}</KokioProvider>
              </AuthRelayProvider>
            </TurnkeyProvider>
          </QueryClientProvider>
        </GestureHandlerRootView>
      </SafeAreaProvider>
    </ThemeProvider>
  );
};