import React from "react";
import { View, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { useColors } from "@/hooks/useColors";
import { useCopyFeedback } from "@/hooks/useCopyFeedback";
import QRCode from "react-native-qrcode-svg";

interface ReceiveAddressCardProps {
  address: string;
}

// The QR + address + copy block shared by ReceiveSheet and DepositSheet's
// "From another wallet" option — both are the same action (show this wallet's
// address so funds can be sent to it from elsewhere).
export function ReceiveAddressCard({ address }: ReceiveAddressCardProps) {
  const colors = useColors();
  const { copied, copy } = useCopyFeedback();

  return (
    <View style={{ width: "100%", alignItems: "center" }}>
      <View style={{ width: 176, height: 176, borderRadius: 14, backgroundColor: "#fff", alignItems: "center", justifyContent: "center" }}>
        {!!address && <QRCode value={address} size={156} />}
      </View>
      <ThemedText lightColor="#000000" darkColor={colors.mutedForeground} style={{ marginTop: 16, textAlign: "center" }} numberOfLines={2}>
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
    </View>
  );
}

export default ReceiveAddressCard;
