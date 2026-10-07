import React from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { useColors } from "@/hooks/useColors";

interface GlobalSearchRowProps {
  onPress: () => void;
}

export default function GlobalSearchRow({ onPress }: GlobalSearchRowProps) {
  const colors = useColors();

  return (
    <TouchableOpacity
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Global plans"
      style={[styles.row, { backgroundColor: colors.surface }]}
    >
      <Ionicons name="globe-outline" size={20} color={colors.text} />
      <View style={styles.text}>
        <ThemedText bold>Global</ThemedText>
        <ThemedText style={[styles.subtitle, { color: colors.mutedForeground }]}>
          One eSIM for the whole world (200+ countries)
        </ThemedText>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.text} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
  },
  text: {
    flex: 1,
    gap: 2,
  },
  subtitle: {
    fontSize: 13,
  },
});
