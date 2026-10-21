import { forwardRef, useCallback, useImperativeHandle, useState } from "react";
import { Modal, Pressable, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/ThemedText";
import { Theme } from "@/constants/Colors";
import type { Palette } from "@/constants/Colors";
import { useColors } from "@/hooks/useColors";
import { useThemedStyles } from "@/hooks/useThemedStyles";
import { useBottomInset } from "@/hooks/useBottomInset";
import { useShopFilters } from "@/contexts/ShopFiltersContext";
import {
  DATA_FILTER_OPTIONS,
  PRICE_FILTER_OPTIONS,
  VALIDITY_FILTER_OPTIONS,
  DEFAULT_SHOP_FILTERS,
  type DataFilterKey,
  type PriceFilterKey,
  type ShopFilters,
  type ShopFilterSheetHandle,
  type ValidityFilterKey,
} from "@/utils/shopFilters";

export type { ShopFilterSheetHandle };

const SELECTED_LABEL_COLOR = "#000000";

const createStyles = (colors: Palette) =>
  StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: "rgba(0, 0, 0, 0.5)",
      justifyContent: "flex-end",
    },
    sheet: {
      backgroundColor: colors.modalBackground,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
    },
    handle: {
      alignSelf: "center",
      width: 36,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.inactive,
      marginTop: 10,
      marginBottom: 4,
    },
    sheetContent: {
      paddingHorizontal: 20,
      paddingTop: 8,
    },
    sheetHeaderRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 16,
    },
    sectionTitle: {
      marginTop: 20,
      marginBottom: 10,
      color: colors.text,
    },
    chipRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
    },
    chip: {
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
    footerRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginTop: 28,
    },
    clearButton: {
      paddingVertical: 12,
      paddingHorizontal: 8,
    },
    clearLabel: {
      color: colors.link,
    },
    applyButton: {
      flex: 1,
      marginLeft: 16,
      height: 48,
      borderRadius: 14,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.highlight,
    },
    applyLabel: {
      color: SELECTED_LABEL_COLOR,
      fontWeight: "600",
    },
  });

const FilterChipRow = <K extends string>({
  options,
  selected,
  onSelect,
  styles,
}: {
  options: { key: K; label: string }[];
  selected: K;
  onSelect: (key: K) => void;
  styles: ReturnType<typeof createStyles>;
}) => (
  <View style={styles.chipRow}>
    {options.map((option) => {
      const isSelected = option.key === selected;
      return (
        <Pressable
          key={option.key}
          onPress={() => onSelect(option.key)}
          style={[styles.chip, isSelected && styles.chipSelected]}
          accessibilityRole="button"
          accessibilityState={{ selected: isSelected }}
          accessibilityLabel={option.label}
        >
          <ThemedText style={[styles.chipLabel, isSelected && styles.chipLabelSelected]}>
            {option.label}
          </ThemedText>
        </Pressable>
      );
    })}
  </View>
);

const ShopFilterSheet = forwardRef<ShopFilterSheetHandle>((_, ref) => {
  const styles = useThemedStyles(createStyles);
  const colors = useColors();
  const bottomInset = useBottomInset(20);
  const { filters, setFilters, clearFilters } = useShopFilters();

  const [isOpen, setIsOpen] = useState(false);
  const [draft, setDraft] = useState<ShopFilters>(filters);

  useImperativeHandle(
    ref,
    () => ({
      open: () => {
        setDraft(filters);
        setIsOpen(true);
      },
    }),
    [filters]
  );

  const handleClose = useCallback(() => setIsOpen(false), []);

  const handleApply = useCallback(() => {
    setFilters(draft);
    setIsOpen(false);
  }, [draft, setFilters]);

  const handleClearAll = useCallback(() => {
    setDraft(DEFAULT_SHOP_FILTERS);
    clearFilters();
  }, [clearFilters]);

  return (
    <Modal
      visible={isOpen}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={handleClose}
    >
      <Pressable style={styles.backdrop} onPress={handleClose} accessibilityLabel="Close filters">
        {/* Swallows the backdrop's onPress so tapping the sheet itself doesn't close it. */}
        <Pressable onPress={(e) => e.stopPropagation()}>
          <View style={styles.sheet}>
            <View style={styles.handle} />
            <View style={[styles.sheetContent, { paddingBottom: bottomInset }]}>
              <View style={styles.sheetHeaderRow}>
                <ThemedText variant="xl" style={{ color: colors.text }}>
                  Filter Plans
                </ThemedText>
              </View>

              <ThemedText variant="smb" style={styles.sectionTitle}>
                Price
              </ThemedText>
              <FilterChipRow<PriceFilterKey>
                options={PRICE_FILTER_OPTIONS}
                selected={draft.price}
                onSelect={(key) => setDraft((prev) => ({ ...prev, price: key }))}
                styles={styles}
              />

              <ThemedText variant="smb" style={styles.sectionTitle}>
                Data
              </ThemedText>
              <FilterChipRow<DataFilterKey>
                options={DATA_FILTER_OPTIONS}
                selected={draft.data}
                onSelect={(key) => setDraft((prev) => ({ ...prev, data: key }))}
                styles={styles}
              />

              <ThemedText variant="smb" style={styles.sectionTitle}>
                Validity
              </ThemedText>
              <FilterChipRow<ValidityFilterKey>
                options={VALIDITY_FILTER_OPTIONS}
                selected={draft.validity}
                onSelect={(key) => setDraft((prev) => ({ ...prev, validity: key }))}
                styles={styles}
              />

              <View style={styles.footerRow}>
                <Pressable
                  onPress={handleClearAll}
                  style={styles.clearButton}
                  accessibilityRole="button"
                  accessibilityLabel="Clear all filters"
                >
                  <ThemedText style={styles.clearLabel}>Clear all</ThemedText>
                </Pressable>
                <Pressable
                  onPress={handleApply}
                  style={styles.applyButton}
                  accessibilityRole="button"
                  accessibilityLabel="Apply filters"
                >
                  <ThemedText style={styles.applyLabel}>Apply</ThemedText>
                </Pressable>
              </View>
            </View>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
});

ShopFilterSheet.displayName = "ShopFilterSheet";

export default ShopFilterSheet;
