import React from "react";
import { View, StyleSheet, type ViewProps, type StyleProp, type ViewStyle } from "react-native";
import { Theme } from "@/constants/Colors";
import { useBottomInset } from "@/hooks/useBottomInset";

type BottomActionBarProps = ViewProps & {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
};

/**
 * Bottom-anchored container for pinned actions.
 * Place as the last flow child of a flex:1 screen, after the scroll view.
 */
export function BottomActionBar({ children, style, ...rest }: BottomActionBarProps) {
  const bottomInset = useBottomInset();
  return (
    <View style={[styles.bar, { paddingBottom: bottomInset }, style]} {...rest}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    backgroundColor: "transparent",
    paddingHorizontal: Theme.spacing.md,
    paddingTop: 12,
  },
});
