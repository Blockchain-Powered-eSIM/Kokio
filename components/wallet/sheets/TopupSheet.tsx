import React, { forwardRef, useState } from "react";
import { Pressable } from "react-native";
import BottomSheet, { BottomSheetView, BottomSheetBackdrop } from "@gorhom/bottom-sheet";

import { ThemedText } from "@/components/ThemedText";
import { PillButton } from "@/components/ui/PillButton";
import { useColors } from "@/hooks/useColors";

interface TopupSheetProps {
  esimName: string;
}

const TIERS: { gb: number; price: number }[] = [
  { gb: 1, price: 4.5 },
  { gb: 3, price: 9.9 },
  { gb: 5, price: 14.5 },
];

export const TopupSheet = forwardRef<BottomSheet, TopupSheetProps>(({ esimName }, ref) => {
  const colors = useColors();
  const [selected, setSelected] = useState(1);

  const tier = TIERS[selected];

  return (
    <BottomSheet
      ref={ref}
      index={-1}
      snapPoints={["50%"]}
      enablePanDownToClose
      backgroundStyle={{ backgroundColor: colors.sheetBackground }}
      backdropComponent={(props) => (
        <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} opacity={0.5} />
      )}
    >
      <BottomSheetView style={{ padding: 20 }}>
        <ThemedText bold variant="xl" style={{ marginBottom: 4 }}>Top up {esimName}</ThemedText>
        <ThemedText style={{ color: colors.mutedForeground, marginBottom: 16 }}>
          Added to your current eSIM. Days don&apos;t reset.
        </ThemedText>
        {TIERS.map((t, i) => (
          <Pressable
            key={t.gb}
            onPress={() => setSelected(i)}
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              minHeight: 56,
              paddingHorizontal: 16,
              alignItems: "center",
              marginBottom: 8,
              borderRadius: 14,
              backgroundColor: colors.surface,
              borderWidth: 1.5,
              borderColor: selected === i ? colors.primary : "transparent",
            }}
          >
            <ThemedText bold variant="normal">{t.gb} GB</ThemedText>
            <ThemedText bold variant="normal">${t.price.toFixed(2)}</ThemedText>
          </Pressable>
        ))}
        <PillButton variant="solid" style={{ marginTop: 8 }}>
          {`Add ${tier.gb} GB · $${tier.price.toFixed(2)}`}
        </PillButton>
      </BottomSheetView>
    </BottomSheet>
  );
});

TopupSheet.displayName = "TopupSheet";

export default TopupSheet;
