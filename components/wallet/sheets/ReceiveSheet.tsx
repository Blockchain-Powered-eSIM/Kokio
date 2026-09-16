import React, { forwardRef } from "react";
import { View, TouchableOpacity } from "react-native";
import BottomSheet, { BottomSheetView, BottomSheetBackdrop } from "@gorhom/bottom-sheet";
import QRCode from "react-native-qrcode-svg";
import { Ionicons } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { useColors } from "@/hooks/useColors";
import { useCopyFeedback } from "@/hooks/useCopyFeedback";

interface ReceiveSheetProps {
  address: string;
}

export const ReceiveSheet = forwardRef<BottomSheet, ReceiveSheetProps>(({ address }, ref) => {
  const colors = useColors();
  const { copied, copy } = useCopyFeedback();

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
        <ThemedText bold variant="xl">Receive</ThemedText>
        <ThemedText style={{ color: colors.mutedForeground, marginTop: 4, marginBottom: 18, textAlign: "center" }}>
          Only send Base assets to this address.
        </ThemedText>
        <View style={{ width: 176, height: 176, borderRadius: 14, backgroundColor: "#fff", alignItems: "center", justifyContent: "center" }}>
          {!!address && <QRCode value={address} size={156} />}
        </View>
        <ThemedText style={{ color: colors.mutedForeground, marginTop: 16, textAlign: "center" }} numberOfLines={2}>
          {address}
        </ThemedText>
        <TouchableOpacity
          onPress={() => copy(address)}
          style={{
            marginTop: 18,
            width: "100%",
            minHeight: 50,
            borderRadius: 999,
            backgroundColor: colors.primary,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
          }}
        >
          <Ionicons name={copied ? "checkmark" : "copy-outline"} size={18} color={colors.primaryForeground} />
          <ThemedText bold style={{ color: colors.primaryForeground }}>
            {copied ? "Copied" : "Copy address"}
          </ThemedText>
        </TouchableOpacity>
      </BottomSheetView>
    </BottomSheet>
  );
});

ReceiveSheet.displayName = "ReceiveSheet";

export default ReceiveSheet;
