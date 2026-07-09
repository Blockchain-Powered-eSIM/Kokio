/**
 * Shared hook: returns true when the app is in the foreground (AppState === 'active').
 * Extracted from useBffHealth so multiple queries can use the same
 * pattern without duplicating the AppState subscription.
 */

import { useEffect, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

export function useIsAppActive(): boolean {
  const [isActive, setIsActive] = useState(AppState.currentState === 'active');

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state: AppStateStatus) => {
      setIsActive(state === 'active');
    });
    return () => sub.remove();
  }, []);

  return isActive;
}
