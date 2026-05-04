import { useState, useEffect } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { checkBffHealth } from '@/utils/bff/health';

function useIsAppActive(): boolean {
  const [isActive, setIsActive] = useState(AppState.currentState === 'active');
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state: AppStateStatus) => {
      setIsActive(state === 'active');
    });
    return () => sub.remove();
  }, []);
  return isActive;
}

export function useBffHealth() {
  const isActive = useIsAppActive();

  const query = useQuery<boolean>({
    queryKey:             ['bff-health'],
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
