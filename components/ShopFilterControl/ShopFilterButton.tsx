import { Pressable, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { Theme } from "@/constants/Colors";
import type { Palette } from "@/constants/Colors";
import { useThemedStyles } from "@/hooks/useThemedStyles";
import { useThemeColor } from "@/hooks/useThemeColor";

const ICON_SIZE = 24;

const createStyles = (colors: Palette) =>
  StyleSheet.create({
    button: {
      width: 44,
      height: 44,
      borderRadius: Theme.spacing.sm,
      alignItems: "center",
      justifyContent: "center",
    },
    badge: {
      position: "absolute",
      top: 6,
      right: 6,
      width: 9,
      height: 9,
      borderRadius: 5,
      backgroundColor: colors.highlight,
    },
  });

const ShopFilterButton = ({
  isActive,
  onPress,
}: {
  isActive: boolean;
  onPress: () => void;
}) => {
  const styles = useThemedStyles(createStyles);
  const foreground = useThemeColor({}, "foreground");

  return (
    <Pressable
      onPress={onPress}
      style={styles.button}
      accessibilityRole="button"
      accessibilityLabel="Filter plans"
    >
      <Ionicons name="options-outline" size={ICON_SIZE} color={foreground} />
      {isActive && <View style={styles.badge} />}
    </Pressable>
  );
};

export default ShopFilterButton;
