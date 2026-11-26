import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useColorScheme as useSystemColorScheme } from "react-native";
import { THEME_STORAGE_KEY } from "@/constants/Colors";

export type ThemeMode = "system" | "light" | "dark";

type ThemeContextValue = {
  isDark: boolean;
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => Promise<void>;
};

const ThemeContext = createContext<ThemeContextValue>({
  isDark: true,
  themeMode: "system",
  setThemeMode: async () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useSystemColorScheme();
  const [themeMode, setThemeModeState] = useState<ThemeMode>("system");

  useEffect(() => {
    AsyncStorage.getItem(THEME_STORAGE_KEY).then((val) => {
      if (val === "light" || val === "dark" || val === "system") {
        setThemeModeState(val);
      }
    });
  }, []);

  const setThemeMode = useCallback(async (mode: ThemeMode) => {
    await AsyncStorage.setItem(THEME_STORAGE_KEY, mode);
    setThemeModeState(mode);
  }, []);

  const isDark = themeMode === "system" ? systemScheme !== "light" : themeMode === "dark";

  return (
    <ThemeContext.Provider value={{ isDark, themeMode, setThemeMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
