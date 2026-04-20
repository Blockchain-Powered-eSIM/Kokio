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


/*
The key idea here is a 3-layer depth system:

#A8D8E8 sky as the raw background — everything sits on top of it
#FFFFFF pure white for primary cards (header, active payment row) — feels like a cloud popping off the sky
#EEF8FC cloud-white for secondary/inactive rows — subtly recessed

The coral #E8614A CTA pops beautifully against the blue, same energy as the beach umbrella in the Kokio illustration. 

light: {
  background:  '#A8D8E8',  // sky — app bg
  card:        '#C5E8F2',  // horizon — nav/tabs
  cardSurface: '#FFFFFF',  // white — main cards
  input:       '#EEF8FC',  // cloud — inputs/secondary cards
  text:        '#1A3D4F',  // deep navy
  foreground:  '#4A8090',  // slate — secondary text
  muted:       '#7ABCCC',  // sky muted — placeholders
  border:      '#C5E8F2',  // soft sky border
  secondary:   '#E8614A',  // coral — CTA
  accent:      '#2A8FA0',  // deep teal — icons/active
}

*/


// // styles.ts
// import { StyleSheet } from "react-native";

// const tintColorLight = "#2A8FA0";
// const tintColorDark = "#fff";

// export const Colors = {
//   light: {
//     text: "#1A3D4F",
//     background: "#A8D8E8",       // sky blue — app background
//     tint: tintColorLight,
//     icon: "#2A8FA0",
//     tabIconDefault: "#7ABCCC",
//     tabIconSelected: tintColorLight,
//     headerText: "#4A8090",

//     foreground: "#4A8090",

//     card: "#FFFFFF",             // white — main cards
//     cardForeground: "#1A3D4F",

//     popover: "#FFFFFF",
//     popoverForeground: "#1A3D4F",

//     primary: "#2A8FA0",          // deep teal
//     primaryForeground: "#FFFFFF",

//     secondary: "#EEF8FC",        // cloud white — secondary cards, inputs
//     secondaryForeground: "#1A3D4F",
//     secondaryBackground: "#C5E8F2", // horizon blue — tab bars, nav

//     muted: "#C5E8F2",
//     mutedForeground: "#7ABCCC",

//     accent: "#E8614A",           // coral — CTA buttons
//     accentForeground: "#FFFFFF",

//     destructive: "#E8614A",
//     destructiveForeground: "#FFFFFF",

//     border: "#C5E8F2",
//     input: "#EEF8FC",
//     ring: "#2A8FA0",

//     highlight: "#F5A623",        // sandy gold — secondary accent
//     inactive: "#7ABCCC",

//     goldenYellow: "#F5A623",     // kept for parity with dark theme
//   },

//   dark: {
//     text: "white",
//     background: "#000",
//     tint: "#fff",
//     headerText: "#9BA1A6",
//     icon: "#9BA1A6",
//     tabIconDefault: "#9BA1A6",
//     tabIconSelected: "#fff",
//     highlight: "#FFCC00",
//     secondaryBackground: "#242427",
//     inactive: "#777777",

//     foreground: "#AEAEB2",

//     card: "#FFD60A",
//     cardForeground: "#000000",

//     goldenYellow: "#FFAF01",

//     popover: "#242427",
//     popoverForeground: "#E5E5EA",

//     primary: "#FF9F0A",
//     primaryForeground: "#000000",

//     secondary: "#FFD60A",
//     secondaryForeground: "#000000",

//     muted: "#46464B",
//     mutedForeground: "#AEAEB2",

//     accent: "#767680",
//     accentForeground: "#8E8E93",

//     destructive: "#ff0000",
//     destructiveForeground: "#ffffff",

//     border: "#FF9F0A",
//     input: "#46464B",
//     ring: "#006FEE",
//   },
// };

// // 🌤 Switch between "light" (Kokio sky) and "dark" (current black/yellow) here:
// const ACTIVE_THEME = Colors.dark;

// export const Theme = {
//   colors: {
//     ...ACTIVE_THEME,
//     highlight: ACTIVE_THEME.highlight ?? "#FFCC00",
//     background: ACTIVE_THEME.secondaryBackground ?? ACTIVE_THEME.background,
//     inactive: ACTIVE_THEME.inactive ?? "#777777",
//   },
//   spacing: {
//     xs: 4,
//     sm: 8,
//     md: 16,
//     md_l: 20,
//     lg: 24,
//     xl: 32,
//   },
//   borderRadius: {
//     small: 4,
//     medium: 8,
//     large: 16,
//   },
// };

// export const createStyles = (StyleSheet: any) =>
//   StyleSheet.create({
//     tabBar: {
//       backgroundColor: Theme.colors.background,
//       borderTopColor: Theme.colors.background,
//       height: 60,
//       paddingBottom: Theme.spacing.xs,
//     },
//     tabBarIcon: {
//       marginTop: Theme.spacing.xs,
//     },
//   });

// export const globalStyles = StyleSheet.create({
//   container: {
//     flex: 1,
//     backgroundColor: Theme.colors.background,
//     padding: 10,
//     paddingTop: 20,
//     paddingBottom: 40,
//   },
//   list: {
//     backgroundColor: Theme.colors.secondaryBackground,
//     borderRadius: 25,
//     maxHeight: "auto",
//     padding: 10,
//     paddingTop: 20,
//     paddingBottom: 40,
//   },
//   menuItem: {
//     padding: 16,
//   },
//   menuItemContent: {
//     flexDirection: "row",
//     alignItems: "center",
//   },
//   menuItemText: {
//     color: ACTIVE_THEME.text,
//     fontSize: 16,
//     fontWeight: "500",
//     flex: 1,
//   },
//   iconLeft: {
//     marginRight: 16,
//   },
//   iconRight: {
//     marginLeft: 16,
//   },
//   tabBar: {
//     backgroundColor: Theme.colors.secondaryBackground,
//     borderTopColor: Theme.colors.secondaryBackground,
//   },
// });