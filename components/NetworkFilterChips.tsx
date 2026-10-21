import { Pressable, ScrollView, StyleProp, StyleSheet, ViewStyle } from "react-native";

import { ThemedText } from "@/components/ThemedText";
import { Theme } from "@/constants/Colors";
import type { Palette } from "@/constants/Colors";
import { useThemedStyles } from "@/hooks/useThemedStyles";

const SELECTED_LABEL_COLOR = "#000000";

const createStyles = (colors: Palette) =>
  StyleSheet.create({
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      paddingHorizontal: 8,
    },
    chip: {
      minHeight: 36,
      justifyContent: "center",
      paddingVertical: 8,
      paddingHorizontal: 14,
      borderRadius: Theme.borderRadius.large,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.inactive,
    },
    chipSelected: {
      backgroundColor: colors.highlight,
      borderColor: colors.highlight,
    },
    chipLabel: {
      color: colors.text,
    },
    chipLabelSelected: {
      color: SELECTED_LABEL_COLOR,
      fontWeight: "600",
    },
  });

type NetworkFilterChipsProps = {
  options: string[];
  selected: string | null;
  onSelect: (network: string | null) => void;
  containerStyle?: StyleProp<ViewStyle>;
};

const NetworkFilterChips = ({
  options,
  selected,
  onSelect,
  containerStyle,
}: NetworkFilterChipsProps) => {
  const styles = useThemedStyles(createStyles);

  if (options.length <= 1) return null;

  const allSelected = selected === null;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={containerStyle}
      contentContainerStyle={styles.row}
    >
      <Pressable
        onPress={() => onSelect(null)}
        style={[styles.chip, allSelected && styles.chipSelected]}
        accessibilityRole="button"
        accessibilityState={{ selected: allSelected }}
        accessibilityLabel="All networks"
      >
        <ThemedText style={[styles.chipLabel, allSelected && styles.chipLabelSelected]}>
          All
        </ThemedText>
      </Pressable>
      {options.map((network) => {
        const isSelected = network === selected;
        return (
          <Pressable
            key={network}
            onPress={() => onSelect(network)}
            style={[styles.chip, isSelected && styles.chipSelected]}
            accessibilityRole="button"
            accessibilityState={{ selected: isSelected }}
            accessibilityLabel={`Filter by network: ${network}`}
          >
            <ThemedText style={[styles.chipLabel, isSelected && styles.chipLabelSelected]}>
              {network}
            </ThemedText>
          </Pressable>
        );
      })}
    </ScrollView>
  );
};

export default NetworkFilterChips;
