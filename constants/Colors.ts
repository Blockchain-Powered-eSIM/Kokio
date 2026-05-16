// styles.ts
import { StyleSheet } from "react-native";

const tintColorLight = "#2A8FA0";

export const Colors = {
  light: {
    text: "#1A3D4F",           // deep navy
    background: "#A8D8E8",     // sky blue — app bg
    tint: tintColorLight,
    icon: "#2A8FA0",
    tabIconDefault: "#7ABCCC",
    tabIconSelected: tintColorLight,
    headerText: "#4A8090",
    foreground: "#4A8090",     // slate — secondary text
    card: "#FFFFFF",           // white — main cards
    cardForeground: "#1A3D4F",
    popover: "#FFFFFF",
    popoverForeground: "#1A3D4F",
    primary: "#2A8FA0",        // deep teal
    primaryForeground: "#FFFFFF",
    secondary: "#E8614A",      // coral — CTA
    secondaryForeground: "#FFFFFF",
    muted: "#C5E8F2",          // sky muted
    mutedForeground: "#7ABCCC",
    accent: "#2A8FA0",         // deep teal — icons/active
    accentForeground: "#FFFFFF",
    destructive: "#FF453A",
    destructiveForeground: "#FFFFFF",
    border: "#C5E8F2",
    input: "#EEF8FC",          // cloud white — inputs
    ring: "#2A8FA0",
  },

  dark: {
    text: "white",
    background: "#000",
    tint: "#fff",
    headerText:  "#9BA1A6",
    icon: "#9BA1A6",
    tabIconDefault: "#9BA1A6",
    tabIconSelected: "#fff",
    highlight: "#FFCC00",
    secondaryBackground: "#242427",
    inactive: "#777777",

    // background: '#ffffff',
    foreground: "#AEAEB2",

    card: "#FFD60A",
    cardForeground: "#000000",

    goldenYellow: "#FFAF01",

    popover: "#242427",
    popoverForeground: "#E5E5EA",

    primary: "#FF9F0A",
    primaryForeground: "#000000",

    secondary: "#FFD60A",
    secondaryForeground: "#000000",

    muted: "#46464B",
    mutedForeground: "#AEAEB2",

    accent: "#767680",
    accentForeground: "#8E8E93",

    destructive: "#FF453A",
    destructiveForeground: "#ffffff",

    border: "#FF9F0A",

    input: "#46464B",

    ring: "#006FEE",

    success: "#30D158",
  },
};

const EXTRA_TOKENS = {
  highlight: "#FFCC00",
  inactive: "#777777",
  success: "#30D158",
  successBackground: "rgba(48, 209, 88, 0.12)",
  destructiveBackground: "rgba(255, 69, 58, 0.12)",
  overlay: "rgba(0, 0, 0, 0.5)",
  overlayMedium: "rgba(0, 0, 0, 0.6)",
  overlayDark: "rgba(0, 0, 0, 0.7)",
  handle: "rgba(60, 60, 67, 0.2)",
  handleArrow: "rgba(60, 60, 67, 0.8)",
  info: "#64D2FF",
  link: "#4A9EFF",
  gradientDark: "#404040",
  modalBackground: "rgba(60, 60, 60, 0.9)",
  contentBackground: "rgba(100, 100, 100, 0.9)",
  itemBackground: "#1c1c1e",
  warning: "#FF9500",
  pink: "#FF2D55",
  systemBlue: "#007AFF",
  sheetBackground: "rgba(37, 37, 37, 0.95)",
};

const DARK_TOKENS = {
  ...Colors.dark,
  ...EXTRA_TOKENS,
  background: "#242427",
  inputBackground: "#7676803D",
  surface: "#1a1a1a",
  surfaceElevated: "#2a2a2a",
  skeletonBase: "#5C5C61",
  skeletonHighlight: "#E0E0E0",
  shopCta: "#FFAF01",           // dark: keeps current goldenYellow
  payButton: "#FFD60A",         // dark: keeps current secondary
  walletModalBackground: "rgba(60, 60, 60, 0.9)", // dark: same as modalBackground
};

const LIGHT_TOKENS = {
  ...Colors.light,
  ...EXTRA_TOKENS,
  background: "#A8D8E8",
  inputBackground: "#EEF8FC",
  surface: "#EEF8FC",
  surfaceElevated: "#FFFFFF",
  skeletonBase: "#C5E8F2",
  skeletonHighlight: "#EEF8FC",
  destructive: "#FF453A",
  secondaryBackground: "#FFFFFF",   // white tab bar
  goldenYellow: "#E8614A",          // coral — no yellow in light theme
  shopCta: "#7ABCCC",               // light: muted sky blue
  payButton: "#FFFFFF",             // light: white
  cardForeground: "#1A3D4F",
  highlight: "#E8614A",             // coral active tab tint
  inactive: "#7ABCCC",
  link: "#2A8FA0",
  gradientDark: "#FFFFFF",          // wallet card gradient start: white → sky
  modalBackground: "rgba(255, 255, 255, 0.95)",
  walletModalBackground: "rgba(168, 216, 232, 0.75)",
  contentBackground: "#FFFFFF",
  itemBackground: "#FFFFFF",
  sheetBackground: "rgba(255, 255, 255, 0.95)",
};

export const THEME_STORAGE_KEY = "@kokio_theme";

export let isDarkTheme = true;

export const Theme = {
  colors: { ...DARK_TOKENS } as typeof DARK_TOKENS & typeof LIGHT_TOKENS,
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    md_l: 20,
    lg: 24,
    xl: 32,
  },
  borderRadius: {
    small: 4,
    medium: 8,
    large: 16,
  },
};

export function applyTheme(isDark: boolean) {
  isDarkTheme = isDark;
  const tokens = isDark ? DARK_TOKENS : LIGHT_TOKENS;
  Object.assign(Theme.colors, tokens);
}

export const createStyles = (StyleSheet: any) =>
  StyleSheet.create({
    tabBar: {
      backgroundColor: Theme.colors.secondaryBackground,
      borderTopColor: Theme.colors.border,
      height: 60,
      paddingBottom: Theme.spacing.xs,
    },
    tabBarIcon: {
      marginTop: Theme.spacing.xs,
    },
  });

export const globalStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.background,
    padding: 10,
    paddingTop: 20,
    paddingBottom: 40,
  },
  list: {
    backgroundColor: Theme.colors.secondaryBackground,
    borderRadius: 25,
    maxHeight: "auto",
    padding: 10,
    paddingTop: 20,
    paddingBottom: 40,
  },
  menuItem: {
    padding: 16,
  },
  menuItemContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  menuItemText: {
    color: Colors.dark.text,
    fontSize: 16,
    fontWeight: "500",
    flex: 1,
  },
  iconLeft: {
    marginRight: 16,
  },
  iconRight: {
    marginLeft: 16,
  },
  tabBar: {
    backgroundColor: Theme.colors.secondaryBackground,
    borderTopColor: Theme.colors.secondaryBackground,
  },
});