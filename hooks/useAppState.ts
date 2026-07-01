import { useEffect, useState, useRef } from "react";
import { AppState } from "react-native";

export function useAppState(reauth?: boolean) {
  const appState = useRef(AppState.currentState);
  const [appStateVisible, setAppStateVisible] = useState(appState.current);
  
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextAppState) => {
      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === "active"
      ) {
        console.log("Kokio App has come to the foreground!");
      } else {
        if (reauth) {
          // reauthenticate();
          console.log("App has gone to the background!");
        }
      }
      
      appState.current = nextAppState;
      setAppStateVisible(appState.current);
      console.log("AppState", appState.current);
    });
    
    return () => {
      subscription.remove();
    };
  }, [reauth]);

  return appStateVisible;
}
