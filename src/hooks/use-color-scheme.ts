import { useTheme } from "@/contexts/ThemeContext";

export function useColorScheme() {
  const { isDark } = useTheme();
  return isDark ? "dark" : "light";
}
