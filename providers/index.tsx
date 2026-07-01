import React, { ReactNode } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { AuthRelayProvider } from "./authProvider";
import { KokioProvider } from "./kokioProvider";
import { KokioStripeProvider } from "./StripeProvider";

import { ToastProvider } from "@/contexts/ToastContext";
import { useColorScheme } from "@/hooks/useColorScheme";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
    },
  },
});

// Used ReactNode as ReactElement will make call sites reject mutiple children
export const Providers = ({ children }: { children: ReactNode }) => {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <SafeAreaProvider>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <QueryClientProvider client={queryClient}>
            <KokioStripeProvider>
              <AuthRelayProvider>
                <KokioProvider>
                  <ToastProvider>{children}</ToastProvider>
                </KokioProvider>
              </AuthRelayProvider>
            </KokioStripeProvider>
          </QueryClientProvider>
        </GestureHandlerRootView>
      </SafeAreaProvider>
    </ThemeProvider>
  );
};
