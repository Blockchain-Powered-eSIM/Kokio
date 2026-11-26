import React from "react";
import { View, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { useColors } from "@/hooks/useColors";
import { TokenIcon } from "@/components/wallet/TokenIcon";
import type { WalletToken } from "@/hooks/useWalletTokens";

interface TokenGridProps {
  tokens: WalletToken[];
  onAddToken: () => void;
}

function TokenCell({ token }: { token: WalletToken }) {
  const colors = useColors();
  return (
    <View style={{ flex: 1, alignItems: "center" }}>
      <TokenIcon symbol={token.symbol} icon={token.icon} size={40} />
      <ThemedText lightColor={colors.cardForeground} darkColor={colors.cardForeground} bold style={{ marginTop: 8 }}>
        {token.symbol}
      </ThemedText>
      <ThemedText lightColor={colors.cardForeground} darkColor={colors.cardForeground} variant="sm" style={{ marginTop: 2 }}>
        {token.amount ?? "—"}
      </ThemedText>
    </View>
  );
}

export function AddTokenButton({ onPress, color }: { onPress: () => void; color?: string }) {
  const colors = useColors();
  const tint = color ?? colors.cardForeground;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Add a token"
      style={{ alignItems: "center" }}
    >
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: 999,
          borderWidth: 1.5,
          borderColor: tint,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Ionicons name="add" size={22} color={tint} />
      </View>
      <ThemedText lightColor={tint} darkColor={tint} variant="sm" style={{ marginTop: 8 }}>
        Add token
      </ThemedText>
    </Pressable>
  );
}

export function TokenGrid({ tokens, onAddToken }: TokenGridProps) {
  return (
    <View style={{ marginTop: 20, marginBottom: 12, paddingHorizontal: 12, flexDirection: "row" }}>
      {tokens.map((token) => (
        <TokenCell key={token.symbol} token={token} />
      ))}
      <View style={{ flex: 1, alignItems: "center" }}>
        <AddTokenButton onPress={onAddToken} />
      </View>
    </View>
  );
}

export default TokenGrid;
