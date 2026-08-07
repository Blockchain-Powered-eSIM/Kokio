import { useTheme } from "@/contexts/ThemeContext";
import { DARK_TOKENS, LIGHT_TOKENS, type Palette } from "@/constants/Colors";

// Reactive palette. isDark comes from ThemeContext, so components re-render on theme flip (React Compiler included).
export function useColors(): Palette {
  const { isDark } = useTheme();
  return isDark ? DARK_TOKENS : LIGHT_TOKENS;
}
