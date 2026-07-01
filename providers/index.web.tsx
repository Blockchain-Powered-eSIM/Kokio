import React, { ReactElement } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
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

export const Providers = ({ children }: { children: ReactElement }) => {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <KokioStripeProvider>
            <AuthRelayProvider>
              <KokioProvider>
                <ToastProvider>{children}</ToastProvider>
              </KokioProvider>
            </AuthRelayProvider>
          </KokioStripeProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </ThemeProvider>
  );
};
