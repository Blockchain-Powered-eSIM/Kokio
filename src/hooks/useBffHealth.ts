import { useQuery } from '@tanstack/react-query';
import { checkBffHealth } from '@/lib/api/bff/health';
import { useIsAppActive } from '@/hooks/useIsAppActive';
import { BFF_HEALTH_KEY } from '@/lib/query-keys';

export function useBffHealth() {
  const isActive = useIsAppActive();

  const query = useQuery<boolean>({
    queryKey:             [BFF_HEALTH_KEY],
    queryFn:              checkBffHealth,
    refetchInterval:      5 * 60 * 1_000,
    refetchOnMount:       true,
    refetchOnWindowFocus: true,
    enabled:              isActive,
  });

  // Optimistic: assume healthy until the first check resolves
  return {
    isHealthy:  query.data ?? true,
    isChecking: query.isLoading,
  };
}
