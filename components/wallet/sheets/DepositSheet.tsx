import React, { forwardRef } from "react";
import { View, Pressable } from "react-native";
import BottomSheet, { BottomSheetView, BottomSheetBackdrop } from "@gorhom/bottom-sheet";
import { Ionicons } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { useColors } from "@/hooks/useColors";

const OPTIONS: { icon: keyof typeof Ionicons.glyphMap; title: string; description: string }[] = [
  { icon: "card-outline", title: "Debit or credit card", description: "Apple Pay, Visa, Mastercard" },
  { icon: "business-outline", title: "Bank transfer", description: "1-2 working days" },
  { icon: "arrow-down-outline", title: "From another wallet", description: "Send to your address" },
];

export const DepositSheet = forwardRef<BottomSheet>((_props, ref) => {
  const colors = useColors();

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
        <ThemedText bold variant="xl" style={{ marginBottom: 4 }}>Add funds</ThemedText>
        <ThemedText style={{ color: colors.mutedForeground, marginBottom: 16 }}>
          Money arrives as USDC on Base.
        </ThemedText>
        {OPTIONS.map((o, i) => (
          <Pressable
            key={o.title}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 13,
              padding: 12,
              marginBottom: 6,
              borderRadius: 14,
              backgroundColor: i === 0 ? colors.surface : "transparent",
            }}
          >
            <View style={{ width: 40, height: 40, borderRadius: 999, backgroundColor: colors.surfaceElevated, alignItems: "center", justifyContent: "center" }}>
              <Ionicons name={o.icon} size={19} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <ThemedText bold>{o.title}</ThemedText>
              <ThemedText style={{ color: colors.mutedForeground, fontSize: 12.5, marginTop: 1 }}>{o.description}</ThemedText>
            </View>
          </Pressable>
        ))}
        <ThemedText style={{ color: colors.mutedForeground, fontSize: 12, marginTop: 8, textAlign: "center" }}>
          Not available yet — coming soon.
        </ThemedText>
      </BottomSheetView>
    </BottomSheet>
  );
});

DepositSheet.displayName = "DepositSheet";

export default DepositSheet;
