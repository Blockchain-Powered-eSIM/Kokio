import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { applyTheme, THEME_STORAGE_KEY } from "@/constants/Colors";

type ThemeContextValue = {
  isDark: boolean;
  toggleTheme: (value: boolean) => Promise<void>;
};

const ThemeContext = createContext<ThemeContextValue>({
  isDark: true,
  toggleTheme: async () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(THEME_STORAGE_KEY).then((val) => {
      const dark = val !== "light";
      applyTheme(dark);
      setIsDark(dark);
    });
  }, []);

  const toggleTheme = useCallback(async (value: boolean) => {
    applyTheme(value);
    await AsyncStorage.setItem(THEME_STORAGE_KEY, value ? "dark" : "light");
    setIsDark(value);
  }, []);

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
