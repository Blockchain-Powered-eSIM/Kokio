import React, { forwardRef } from "react";
import BottomSheet, { BottomSheetView, BottomSheetBackdrop } from "@gorhom/bottom-sheet";

import { View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { useColors } from "@/hooks/useColors";
import { ReceiveAddressCard } from "@/components/wallet/ReceiveAddressCard";

interface ReceiveSheetProps {
  address: string;
}

export const ReceiveSheet = forwardRef<BottomSheet, ReceiveSheetProps>(({ address }, ref) => {
  const colors = useColors();

  return (
    <BottomSheet
      ref={ref}
      index={-1}
      enableDynamicSizing
      enablePanDownToClose
      backgroundStyle={{ backgroundColor: colors.sheetBackground }}
      backdropComponent={(props) => (
        <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} opacity={0.5} />
      )}
    >
      <BottomSheetView style={{ padding: 20, alignItems: "center" }}>
        <ThemedText lightColor="#000000" bold variant="xl">Receive</ThemedText>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 10,
            marginTop: 8,
            marginBottom: 18,
            padding: 12,
            borderRadius: 14,
            borderWidth: 1,
            borderColor: colors.warning,
            backgroundColor: colors.warning + "22",
          }}
        >
          <Ionicons name="warning-outline" size={20} color={colors.warning} />
          <ThemedText lightColor="#000000" darkColor={colors.foreground} bold style={{ flex: 1 }}>
            Only send Base assets to this address.
          </ThemedText>
        </View>
        <ReceiveAddressCard address={address} />
      </BottomSheetView>
    </BottomSheet>
  );
});

ReceiveSheet.displayName = "ReceiveSheet";

export default ReceiveSheet;
