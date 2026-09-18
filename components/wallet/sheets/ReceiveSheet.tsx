import React, { forwardRef } from "react";
import BottomSheet, { BottomSheetView, BottomSheetBackdrop } from "@gorhom/bottom-sheet";

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
      snapPoints={["55%"]}
      enablePanDownToClose
      backgroundStyle={{ backgroundColor: colors.sheetBackground }}
      backdropComponent={(props) => (
        <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} opacity={0.5} />
      )}
    >
      <BottomSheetView style={{ padding: 20, alignItems: "center" }}>
        <ThemedText lightColor="#000000" bold variant="xl">Receive</ThemedText>
        <ThemedText lightColor="#000000" darkColor={colors.mutedForeground} style={{ marginTop: 4, marginBottom: 18, textAlign: "center" }}>
          Only send Base assets to this address.
        </ThemedText>
        <ReceiveAddressCard address={address} />
      </BottomSheetView>
    </BottomSheet>
  );
});

ReceiveSheet.displayName = "ReceiveSheet";

export default ReceiveSheet;
