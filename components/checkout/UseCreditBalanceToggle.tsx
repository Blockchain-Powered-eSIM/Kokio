import React from "react";
import { StyleSheet, Switch, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

import { useColors } from "@/hooks/useColors";
import { useTheme } from "@/contexts/ThemeContext";
import { useThemedStyles } from "@/hooks/useThemedStyles";
import type { Palette } from "@/constants/Colors";
import { formatCents } from "@/utils/orderStatus";

const createStyles = (colors: Palette) =>
  StyleSheet.create({
    wrapper: {
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.primary + "40",
      overflow: "hidden",
      marginBottom: 14,
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
    pendingPill: {
      borderRadius: 999,
      paddingHorizontal: 6,
      paddingVertical: 2,
      backgroundColor: colors.primary,
    },
    pendingPillText: {
      fontSize: 10,
      fontWeight: "700",
      color: colors.primaryForeground,
    },
    subtitle: {
      fontSize: 12,
      color: colors.mutedForeground,
    },
  });

type Props = {
  value: boolean;
  onValueChange: (value: boolean) => void;
  availableCents: number;
  heldCents: number;
  disabled?: boolean;
  loading?: boolean;
};

export default function UseCreditBalanceToggle({
  value,
  onValueChange,
  availableCents,
  heldCents,
  disabled = false,
  loading = false,
}: Props) {
  const styles = useThemedStyles(createStyles);
  const colors = useColors();
  const { isDark } = useTheme();
  const enabled = availableCents > 0 && !disabled && !loading;

  return (
    <View style={[styles.wrapper, !enabled && { opacity: 0.6 }]}>
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
            <Text style={styles.title}>Use Kokio credits</Text>
            {heldCents > 0 && (
              <View style={styles.pendingPill}>
                <Text style={styles.pendingPillText}>{`+ ${formatCents(heldCents)} Pending`}</Text>
              </View>
            )}
          </View>
          <Text style={[styles.subtitle, !isDark && { color: colors.text }]}>
            {loading ? "Checking your balance..." : `Available: ${formatCents(availableCents)}`}
          </Text>
        </View>
        <Switch
          value={value && enabled}
          onValueChange={onValueChange}
          disabled={!enabled}
          trackColor={{ false: colors.muted, true: colors.primary }}
          thumbColor={colors.primaryForeground}
          accessibilityLabel="Use Kokio credits"
        />
      </LinearGradient>
    </View>
  );
}
