import React from "react";
import { StyleSheet, Switch, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

import { useColors } from "@/hooks/useColors";
import { useTheme } from "@/contexts/ThemeContext";
import { useThemedStyles } from "@/hooks/useThemedStyles";
import type { Palette } from "@/constants/Colors";

const createStyles = (colors: Palette) =>
  StyleSheet.create({
    wrapper: {
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.primary + "40",
      overflow: "hidden",
      marginBottom: 14,
      opacity: 0.6,
    },
    gradient: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingVertical: 12,
      paddingHorizontal: 14,
    },
    iconChip: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.primary + "26",
    },
    textBlock: {
      flex: 1,
      gap: 2,
    },
    titleRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    title: {
      fontSize: 14,
      fontWeight: "700",
      color: colors.text,
    },
    soonPill: {
      borderRadius: 999,
      paddingHorizontal: 6,
      paddingVertical: 2,
      backgroundColor: colors.primary,
    },
    soonPillText: {
      fontSize: 10,
      fontWeight: "700",
      color: colors.primaryForeground,
      textTransform: "uppercase",
    },
    subtitle: {
      fontSize: 12,
      color: colors.mutedForeground,
    },
  });

// UI-only placeholder — toggling it has no effect on the order yet. Wired up
// once credit balances are supported by the backend.
export default function UseCreditBalanceToggle() {
  const styles = useThemedStyles(createStyles);
  const colors = useColors();
  const { isDark } = useTheme();

  return (
    <View style={styles.wrapper}>
      <LinearGradient
        colors={[colors.primary + "1f", colors.surfaceElevated]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0.4 }}
        style={styles.gradient}
      >
        <View style={styles.iconChip}>
          <Ionicons name="sparkles-outline" size={18} color={colors.primary} />
        </View>
        <View style={styles.textBlock}>
          <View style={styles.titleRow}>
            <Text style={styles.title}>Use credit balance</Text>
            <View style={styles.soonPill}>
              <Text style={styles.soonPillText}>Soon</Text>
            </View>
          </View>
          <Text style={[styles.subtitle, !isDark && { color: colors.text }]}>
            Apply your Kokio credit toward this order
          </Text>
        </View>
        <Switch
          value={false}
          disabled
          trackColor={{ false: colors.muted, true: colors.primary }}
          thumbColor={colors.primaryForeground}
          accessibilityLabel="Use credit balance (coming soon)"
        />
      </LinearGradient>
    </View>
  );
}
