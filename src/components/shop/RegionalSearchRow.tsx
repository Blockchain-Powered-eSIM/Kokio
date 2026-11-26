import React from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { useColors } from "@/hooks/useColors";

interface RegionalSearchRowProps {
  name: string;
  onPress: () => void;
}

export default function RegionalSearchRow({ name, onPress }: RegionalSearchRowProps) {
  const colors = useColors();

  return (
    <TouchableOpacity
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${name} region`}
      style={[styles.row, { backgroundColor: colors.surface }]}
    >
      <Ionicons name="map-outline" size={20} color={colors.text} />
      <View style={styles.text}>
        <ThemedText bold>{name}</ThemedText>
        <ThemedText style={[styles.subtitle, { color: colors.mutedForeground }]}>
          Best fit if you&apos;ll visit more countries
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
