import React from "react";
import { TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme, type ThemeMode } from "@/contexts/ThemeContext";
import { ThemedText } from "@/components/ThemedText";
import { useColors } from "@/hooks/use-colors";
import { useThemedStyles } from "@/hooks/use-themed-styles";
import { createStyles } from "../settings-styles";

const THEME_MODE_OPTIONS: { value: ThemeMode; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { value: "system", label: "System", icon: "contrast-outline" },
  { value: "light", label: "Day", icon: "sunny-outline" },
  { value: "dark", label: "Night", icon: "moon-outline" },
];

export const ThemeModePicker = () => {
  const { isDark, themeMode, setThemeMode } = useTheme();
  const styles = useThemedStyles(createStyles);
  const colors = useColors();

  return (
    <View style={styles.themeSection}>
      <ThemedText style={styles.themeLabel}>Display</ThemedText>
      <View style={styles.themeModeRow}>
        {THEME_MODE_OPTIONS.map((option) => {
          const selected = themeMode === option.value;
          return (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.themeModeOption,
                { backgroundColor: selected ? colors.itemBackground : "transparent" },
              ]}
              onPress={() => setThemeMode(option.value)}
              accessibilityRole="button"
              accessibilityLabel={`Use ${option.label} theme`}
              accessibilityState={{ selected }}
            >
              <Ionicons
                name={option.icon}
                size={22}
                color={selected ? colors.primary : (isDark ? colors.mutedForeground : colors.text)}
              />
              <ThemedText
                style={[
                  styles.themeModeOptionLabel,
                  { color: selected ? colors.primary : (isDark ? colors.mutedForeground : colors.text) },
                ]}
              >
                {option.label}
              </ThemedText>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};
