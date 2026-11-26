import { useTheme } from "@/providers/theme-context";

export function useColorScheme() {
  const { isDark } = useTheme();
  return isDark ? "dark" : "light";
}
