import React, { forwardRef, useMemo } from "react";
import { Pressable } from "react-native";
import BottomSheet, { BottomSheetBackdrop, BottomSheetFlatList } from "@gorhom/bottom-sheet";
import { Ionicons } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import CountryFlag, { type CoverageType } from "@/components/ui/CountryFlag";
import { useColors } from "@/hooks/useColors";
import { useBottomInset } from "@/hooks/useBottomInset";
import { esimDisplayName, esimDocToDisplayItem } from "@/helpers/esimDisplay";
import type { ESimDocument } from "@/utils/bff/esim";

export interface EsimTopupPickerItem {
  eSimRef: string;
  /** Fallback text when no matching ESimDocument is found (ICCID last-4 or ref abbreviation). */
  label: string;
  doc?: ESimDocument;
}

interface EsimTopupPickerSheetProps {
  items: EsimTopupPickerItem[];
  selectedEsimRef?: string;
  onSelect: (eSimRef: string) => void;
  onBuyNew: () => void;
}

export const EsimTopupPickerSheet = forwardRef<BottomSheet, EsimTopupPickerSheetProps>(
  ({ items, selectedEsimRef, onSelect, onBuyNew }, ref) => {
    const colors = useColors();
    const bottomInset = useBottomInset();
    // Explicit snap point, so dynamic sizing (on by default) must be off or it adds a second one.
    const snapPoints = useMemo(() => ["65%"], []);

    const renderItem = ({ item }: { item: EsimTopupPickerItem }) => {
      const isSelected = item.eSimRef === selectedEsimRef;
      const display = item.doc ? esimDocToDisplayItem(item.doc) : null;
      return (
        <Pressable
          onPress={() => onSelect(item.eSimRef)}
          accessibilityRole="radio"
          accessibilityState={{ checked: isSelected }}
          accessibilityLabel={`Apply this plan as a top-up to ${item.label}`}
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 12,
            minHeight: 56,
            paddingVertical: 10,
            paddingHorizontal: 12,
            marginBottom: 8,
            borderRadius: 14,
            backgroundColor: isSelected ? colors.primary : "transparent",
            borderWidth: isSelected ? 0 : 1,
            borderColor: colors.mutedForeground,
          }}
        >
          {display && (
            <CountryFlag
              size={28}
              flagUrl={display.serviceRegionFlag ?? ""}
              coverageType={display.coverageType as CoverageType}
              serviceRegionName={display.serviceRegionName}
            />
          )}
          <ThemedText
            lightColor={isSelected ? colors.primaryForeground : "#000000"}
            darkColor={isSelected ? colors.primaryForeground : colors.foreground}
            bold
            numberOfLines={1}
            style={{ flex: 1 }}
          >
            {item.doc ? esimDisplayName(item.doc) : item.label}
          </ThemedText>
          {isSelected && <Ionicons name="checkmark-circle" size={22} color={colors.primaryForeground} />}
        </Pressable>
      );
    };

    return (
      <BottomSheet
        ref={ref}
        index={-1}
        snapPoints={snapPoints}
        enableDynamicSizing={false}
        enablePanDownToClose
        backgroundStyle={{ backgroundColor: colors.sheetBackground }}
        backdropComponent={(props) => (
          <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} opacity={0.5} />
        )}
      >
        <BottomSheetFlatList
          data={items}
          keyExtractor={(item: EsimTopupPickerItem) => item.eSimRef}
          renderItem={renderItem}
          keyboardShouldPersistTaps="handled"
          ListHeaderComponent={
            <ThemedText lightColor="#000000" darkColor={colors.foreground} bold variant="xl" style={{ marginBottom: 12 }}>
              Top up an eSIM
            </ThemedText>
          }
          ListFooterComponent={
            <Pressable
              onPress={onBuyNew}
              accessibilityRole="button"
              accessibilityLabel="Buy a new eSIM instead of topping up"
              style={{
                marginTop: 4,
                paddingVertical: 14,
                borderRadius: 14,
                alignItems: "center",
                borderWidth: 1,
                borderColor: colors.primary,
              }}
            >
              <ThemedText lightColor={colors.primary} darkColor={colors.primary} bold>
                Buy a new eSIM
              </ThemedText>
            </Pressable>
          }
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: bottomInset + 16 }}
        />
      </BottomSheet>
    );
  },
);

EsimTopupPickerSheet.displayName = "EsimTopupPickerSheet";

export default EsimTopupPickerSheet;
