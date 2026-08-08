/**
 * Learn more about light and dark modes:
 * https://docs.expo.dev/guides/color-schemes/
 */
import { useTheme } from "@/contexts/ThemeContext";
import { useColors } from "@/hooks/useColors";
import type { Palette } from "@/constants/Colors";

export function useThemeColor(
  props: { light?: string; dark?: string },
  colorName: keyof Palette
) {
  const { isDark } = useTheme();
  const colors = useColors();
  const colorFromProps = isDark ? props.dark : props.light;
  return colorFromProps ?? colors[colorName];
}
