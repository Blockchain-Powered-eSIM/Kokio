import { isDarkTheme } from "@/constants/Colors";

export function useColorScheme() {
  return isDarkTheme ? "dark" : "light";
}
