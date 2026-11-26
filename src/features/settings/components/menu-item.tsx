import React from "react";
import { TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ThemedText } from "@/components/themed-text";
import { useThemedStyles } from "@/hooks/use-themed-styles";
import { createStyles } from "../settings-styles";

export const MenuItem = ({
  title,
  iconLeft,
  iconRight,
  action,
}: {
  title: string;
  iconLeft: string;
  iconRight: string;
  action: (() => void) | undefined;
}) => {
  const styles = useThemedStyles(createStyles);
  return (
  <TouchableOpacity
    style={styles.menuItem}
    onPress={() => action?.()}
  >
    <View style={styles.menuItemContent}>
      <Ionicons
        /* @ts-ignore */
        name={iconLeft}
        size={24}
        color="white"
        style={styles.iconLeft}
      />
      <ThemedText style={styles.menuItemText}>
        {title}
      </ThemedText>
      <Ionicons
        /* @ts-ignore */
        name={iconRight}
        size={24}
        color="white"
        style={styles.iconRight}
      />
    </View>
  </TouchableOpacity>
  );
};
