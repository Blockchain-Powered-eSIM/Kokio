import { useColors } from "@/hooks/useColors";
import type { Palette } from "@/theme/colors";

export function useThemedStyles<T>(factory: (colors: Palette) => T): T {
  const colors = useColors();
  return factory(colors);
}
