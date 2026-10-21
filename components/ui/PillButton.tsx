import React from "react";
import {
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity,
  ViewStyle,
} from "react-native";

import { ThemedText } from "@/components/ThemedText";
import { useThemedStyles } from "@/hooks/useThemedStyles";
import type { Palette } from "@/constants/Colors";

interface PillButtonProps {
  variant: "solid" | "outline";
  onPress?: () => void;
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  children: React.ReactNode;
  style?: ViewStyle;
}

const createStyles = (colors: Palette) => StyleSheet.create({
  base: {
    width: "100%",
    minHeight: 50,
    borderRadius: 999,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 20,
  },
  solid: {
    backgroundColor: colors.primary,
  },
  outline: {
    backgroundColor: "transparent",
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  disabled: {
    opacity: 0.5,
  },
  solidText: {
    color: colors.primaryForeground,
  },
  outlineText: {
    color: colors.primary,
  },
});

export function PillButton({
  variant,
  onPress,
  disabled,
  loading,
  icon,
  children,
  style,
}: PillButtonProps) {
  const styles = useThemedStyles(createStyles);

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
      style={[
        styles.base,
        variant === "solid" ? styles.solid : styles.outline,
        (disabled || loading) && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === "solid" ? styles.solidText.color : styles.outlineText.color}
        />
      ) : (
        <>
          {icon}
          <ThemedText
            bold
            variant="normal"
            style={variant === "solid" ? styles.solidText : styles.outlineText}
          >
            {children}
          </ThemedText>
        </>
      )}
    </TouchableOpacity>
  );
}

export default PillButton;
