import React, { ReactNode } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from 'expo-router';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';

import { AuthRelayProvider } from '@/features/auth/auth-provider';
import { KokioProvider } from './kokioProvider';
import { KokioStripeProvider } from './StripeProvider';
import { ToastProvider } from '@/contexts/ToastContext';
import { useColorScheme } from '@/hooks/useColorScheme';
import { DEVICE_ESIMS_KEY, DEVICE_ORDERS_KEY } from '@/lib/query-keys';
import { queryClient, asyncStoragePersister } from '@/lib/api/query-client';

export { queryClient, asyncStoragePersister };

// ─── Persisted query keys ──────────────────────────────────────────────────────
const PERSISTED_KEYS: Set<string> = new Set([DEVICE_ESIMS_KEY, DEVICE_ORDERS_KEY]);

export const Providers = ({ children }: { children: ReactNode }) => {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <SafeAreaProvider>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <PersistQueryClientProvider
            client={queryClient}
            persistOptions={{
              persister: asyncStoragePersister,
              dehydrateOptions: {
                shouldDehydrateQuery: (query) =>
                  PERSISTED_KEYS.has(query.queryKey[0] as string),
              },
            }}
          >
            <KokioStripeProvider>
              <AuthRelayProvider>
                <KokioProvider>
                  <ToastProvider>{children}</ToastProvider>
                </KokioProvider>
              </AuthRelayProvider>
            </KokioStripeProvider>
          </PersistQueryClientProvider>
        </GestureHandlerRootView>
      </SafeAreaProvider>
    </ThemeProvider>
  );
};
