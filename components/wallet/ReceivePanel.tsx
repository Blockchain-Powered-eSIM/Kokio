import React from "react";
import { View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { useColors } from "@/hooks/useColors";
import { ReceiveAddressCard } from "@/components/wallet/ReceiveAddressCard";

interface ReceivePanelProps {
  address: string;
  marginTop?: number;
}

export function ReceivePanel({ address, marginTop = 0 }: ReceivePanelProps) {
  const colors = useColors();

  return (
    <View style={{ width: "100%", marginTop }}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 10,
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
    </View>
  );
}

export default ReceivePanel;
