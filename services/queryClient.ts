import { QueryClient } from '@tanstack/react-query';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Extracted from providers/index.tsx so non-provider modules (e.g.
// kokioProvider.tsx) can invalidate queries without importing providers/index.tsx
// and creating an import cycle (index.tsx -> kokioProvider.tsx -> index.tsx).
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
