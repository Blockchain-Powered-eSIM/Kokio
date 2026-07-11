import {
  Text as DefaultText,
  View as DefaultView,
  StyleSheet,
} from "react-native";

import type { ThemedTextProps } from "@/components/ThemedText";
import type { ThemedViewProps } from "@/components/ThemedView";
import { Theme } from "@/constants/Colors";
import { useThemeColor } from "@/hooks/useThemeColor";

// Static layout styles — no Theme.colors, safe at module level
const staticStyles = StyleSheet.create({
  cardHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 0,
  },
  cardTitle: {
    fontSize: 24,
    fontWeight: 700,
  },
  cardContent: {
    padding: 16,
  },
  cardFooter: {
    paddingLeft: 16,
    paddingRight: 16,
    paddingBottom: 16,
    paddingTop: 0,
  },
});

const cardStyle = StyleSheet.create({
  card: {
    width: "100%",
    backgroundColor: Theme.colors.card,
    borderRadius: 21,
  },
});

function Card(props: ThemedViewProps) {
  const { style, lightColor, darkColor, children, ...otherProps } = props;
  const backgroundColor = useThemeColor(
    { light: lightColor, dark: darkColor },
    "card"
  );
  return (
    <DefaultView
      style={[cardStyle.card, { backgroundColor }, style]}
      {...otherProps}
    >
      {children}
    </DefaultView>
  );
}

function CardHeader(props: ThemedViewProps) {
  const { style, lightColor: _lightColor, darkColor: _darkColor, children, ...otherProps } = props;
  return (
    <DefaultView style={[staticStyles.cardHeader, style]} {...otherProps}>
      {children}
    </DefaultView>
  );
}

function CardTitle(props: ThemedTextProps) {
  const { style, lightColor, darkColor, ...otherProps } = props;
  const color = useThemeColor(
    { light: lightColor, dark: darkColor },
    "cardForeground"
  );

  return (
    <DefaultText style={[{ color }, staticStyles.cardTitle, style]} {...otherProps} />
  );
}

function CardContent(props: ThemedViewProps) {
  const { style, lightColor: _lightColor, darkColor: _darkColor, children, ...otherProps } = props;
  return (
    <DefaultView style={[staticStyles.cardContent, style]} {...otherProps}>
      {children}
    </DefaultView>
  );
}

function CardFooter(props: ThemedViewProps) {
  const { style, lightColor: _lightColor, darkColor: _darkColor, children, ...otherProps } = props;
  return (
    <DefaultView style={[staticStyles.cardFooter, style]} {...otherProps}>
      {children}
    </DefaultView>
  );
}

export { Card, CardHeader, CardTitle, CardContent, CardFooter };
