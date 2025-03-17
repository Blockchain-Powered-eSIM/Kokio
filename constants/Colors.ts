// styles.ts
import { StyleSheet } from "react-native";

const tintColorLight = "#0a7ea4";
const tintColorDark = "#fff";

export const Colors = {
  light: {
    text: "#11181C",
    background: "#fff",
    tint: tintColorLight,
    icon: "#687076",
    tabIconDefault: "#687076",
    headerText: "#687076",
    tabIconSelected: tintColorLight,

    // background: '#ffffff',
    foreground: "#09090b",

    card: "#ffffff",
    cardForeground: "#09090b",

    popover: "#ffffff",
    popoverForeground: "#09090b",

    primary: "#006FEE",
    primaryForeground: "#ffffff",

    secondary: "#f4f4f5",
    secondaryForeground: "#09090b",

    muted: "#f4f4f5",
    mutedForeground: "#71717a",

    accent: "#f4f4f5",
    accentForeground: "#09090b",

    destructive: "#ff0000",
    destructiveForeground: "#ffffff",

    border: "#e4e4e7",

    input: "#e4e4e7",

    ring: "#006FEE",
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

    destructive: "#ff0000",
    destructiveForeground: "#ffffff",

    border: "#FF9F0A",

    input: "#46464B",

    ring: "#006FEE",
  },
};

export const Theme = {
  colors: {
    ...Colors.dark, // Using dark theme as default
    highlight: "#FFCC00",
    background: "#242427",
    inactive: "#777777",
  },
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

export const createStyles = (StyleSheet: any) =>
  StyleSheet.create({
    tabBar: {
      backgroundColor: Theme.colors.background,
      borderTopColor: Theme.colors.background,
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
    color: Colors.light.text,
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
