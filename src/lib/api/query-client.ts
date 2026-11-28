import { QueryClient, onlineManager } from '@tanstack/react-query';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';

// React Query cannot see the phone's connection on its own. With this, requests wait while offline
// and every query on screen (the service health check included) runs again on reconnect.
// An unknown reachability counts as online, so a slow probe never holds requests back.
onlineManager.setEventListener((setOnline) =>
  NetInfo.addEventListener((state) => {
    setOnline(state.isConnected !== false && state.isInternetReachable !== false);
  }),
);

// Extracted from providers/index.tsx so non-provider modules (e.g.
// kokio-provider.tsx) can invalidate queries without importing providers/index.tsx
// and creating an import cycle (index.tsx -> kokio-provider.tsx -> index.tsx).
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
    },
  },
});

// Single flat key in AsyncStorage. providers/index.tsx's dehydrateOptions
// filter ensures only its PERSISTED_KEYS queries are written here.
export const asyncStoragePersister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key:     'kokio.rq.cache',
});
