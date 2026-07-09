import React, { ReactNode } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from '@react-navigation/native';
import { QueryClient } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { AuthRelayProvider } from './authProvider';
import { KokioProvider } from './kokioProvider';
import { KokioStripeProvider } from './StripeProvider';
import { ToastProvider } from '@/contexts/ToastContext';
import { useColorScheme } from '@/hooks/useColorScheme';
import { DEVICE_ESIMS_KEY, DEVICE_ORDERS_KEY } from '@/queries/esims';

// ─── Persisted query keys ──────────────────────────────────────────────────────
const PERSISTED_KEYS: Set<string> = new Set([DEVICE_ESIMS_KEY, DEVICE_ORDERS_KEY]);

// ─── QueryClient ──────────────────────────────────────────────────────────────

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
    },
  },
});

// ─── AsyncStorage persister ───────────────────────────────────────────────────
// Single flat key in AsyncStorage.
// The dehydrateOptions filter below ensures only PERSISTED_KEYS queries are written.

const asyncStoragePersister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key:     'kokio.rq.cache',
});

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
