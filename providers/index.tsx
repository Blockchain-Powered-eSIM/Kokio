import { SafeAreaProvider } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { AuthRelayProvider } from "./authProvider";
import { KokioProvider } from "./kokioProvider";
import React from "react";
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ToastProvider } from "@/contexts/ToastContext";
import { useColorScheme } from "@/hooks/useColorScheme";
import { StripeProvider } from "@stripe/stripe-react-native";
import { Config } from "@/appKeys";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
    },
  },
});

export const Providers = ({ children }: { children: React.ReactNode }) => {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <SafeAreaProvider>
        <GestureHandlerRootView>
          <QueryClientProvider client={queryClient}>
            <StripeProvider
              publishableKey={Config.STRIPE_PUBLISHABLE_KEY ?? ""}
              merchantIdentifier={Config.STRIPE_MERCHANT_IDENTIFIER ?? "merchant.app.kokio"}
            >
              <AuthRelayProvider>
                <KokioProvider>
                  <ToastProvider>{children}</ToastProvider>
                </KokioProvider>
              </AuthRelayProvider>
            </StripeProvider>
          </QueryClientProvider>
        </GestureHandlerRootView>
      </SafeAreaProvider>
    </ThemeProvider>
  );
};
