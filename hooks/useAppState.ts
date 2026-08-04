import { useEffect, useState, useRef } from "react";
import { AppState } from "react-native";
import { logger } from '@/utils/logger';

export function useAppState(reauth?: boolean) {
  const appState = useRef(AppState.currentState);
  const [appStateVisible, setAppStateVisible] = useState(AppState.currentState);
  
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextAppState) => {
      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === "active"
      ) {
        logger.debug('APPSTATE_FOREGROUND');
      } else {
        if (reauth) {
          // reauthenticate();
          logger.debug('APPSTATE_BACKGROUND');
        }
      }
      
      appState.current = nextAppState;
      setAppStateVisible(appState.current);
      logger.debug('APPSTATE_CHANGE', { state: appState.current });
    });
    
    return () => {
      subscription.remove();
    };
  }, [reauth]);

  return appStateVisible;
}
