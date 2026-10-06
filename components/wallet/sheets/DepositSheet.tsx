import React, { forwardRef, useImperativeHandle, useRef, useState } from "react";
import { View, Pressable } from "react-native";
import BottomSheet, { BottomSheetView, BottomSheetBackdrop } from "@gorhom/bottom-sheet";
import { Ionicons } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { useColors } from "@/hooks/useColors";
import { ReceiveAddressCard } from "@/components/wallet/ReceiveAddressCard";

interface DepositSheetProps {
  address: string;
}

export const DepositSheet = forwardRef<BottomSheet, DepositSheetProps>(({ address }, ref) => {
  const colors = useColors();
  const localRef = useRef<BottomSheet>(null);
  const [showFromWallet, setShowFromWallet] = useState(false);

  useImperativeHandle(ref, () => localRef.current as BottomSheet, []);

  const handleSelectFromWallet = () => {
    setShowFromWallet(true);
    localRef.current?.snapToIndex(1);
  };

  return (
    <BottomSheet
      ref={localRef}
      index={-1}
      snapPoints={["50%", "82%"]}
      enablePanDownToClose
      backgroundStyle={{ backgroundColor: colors.sheetBackground }}
      backdropComponent={(props) => (
        <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} opacity={0.5} />
      )}
      onChange={(index) => {
        if (index === -1) setShowFromWallet(false);
      }}
    >
      <BottomSheetView style={{ padding: 20 }}>
        {showFromWallet ? (
          <>
            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 16 }}>
              <Pressable
                onPress={() => { setShowFromWallet(false); localRef.current?.snapToIndex(0); }}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                style={{ marginRight: 10 }}
                accessibilityRole="button"
                accessibilityLabel="Back"
              >
                <Ionicons name="chevron-back" size={22} color={colors.text} />
              </Pressable>
              <ThemedText lightColor="#000000" bold variant="xl">From another wallet</ThemedText>
            </View>
            <ThemedText lightColor="#000000" darkColor={colors.mutedForeground} style={{ marginBottom: 18 }}>
              Only send Base assets to this address.
            </ThemedText>
            <ReceiveAddressCard address={address} />
          </>
        ) : (
          <>
            <ThemedText lightColor="#000000" bold variant="xl" style={{ marginBottom: 4 }}>Add funds</ThemedText>
            <ThemedText lightColor="#000000" darkColor={colors.mutedForeground} style={{ marginBottom: 16 }}>
              Money arrives as USDC on Base.
            </ThemedText>
            <Pressable
              onPress={handleSelectFromWallet}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 13,
                padding: 12,
                marginBottom: 6,
                borderRadius: 14,
                backgroundColor: colors.surface,
              }}
            >
              <View style={{ width: 40, height: 40, borderRadius: 999, backgroundColor: colors.surfaceElevated, alignItems: "center", justifyContent: "center" }}>
                <Ionicons name="arrow-down-outline" size={19} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <ThemedText lightColor="#000000" bold>From another wallet</ThemedText>
                <ThemedText lightColor="#000000" darkColor={colors.mutedForeground} style={{ fontSize: 12.5, marginTop: 1 }}>Send to your address</ThemedText>
              </View>
            </Pressable>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 13,
                padding: 12,
                marginBottom: 6,
                borderRadius: 14,
                opacity: 0.5,
              }}
            >
              <View style={{ width: 40, height: 40, borderRadius: 999, backgroundColor: colors.surfaceElevated, alignItems: "center", justifyContent: "center" }}>
                <Ionicons name="card-outline" size={19} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <ThemedText lightColor="#000000" bold>Debit or credit card</ThemedText>
                <ThemedText lightColor="#000000" darkColor={colors.mutedForeground} style={{ fontSize: 12.5, marginTop: 1 }}>Apple Pay, Visa, Mastercard</ThemedText>
              </View>
              <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, backgroundColor: colors.surfaceElevated }}>
                <ThemedText lightColor="#000000" darkColor={colors.mutedForeground} style={{ fontSize: 11, fontWeight: "700" }}>Coming soon</ThemedText>
              </View>
            </View>
          </>
        )}
      </BottomSheetView>
    </BottomSheet>
  );
});

DepositSheet.displayName = "DepositSheet";

export default DepositSheet;
