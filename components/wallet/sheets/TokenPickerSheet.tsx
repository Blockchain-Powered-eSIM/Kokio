import React, { forwardRef, useMemo } from "react";
import { Pressable, View } from "react-native";
import BottomSheet, { BottomSheetBackdrop, BottomSheetFlatList } from "@gorhom/bottom-sheet";
import { Ionicons } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { TokenIcon } from "@/components/wallet/TokenIcon";
import { useColors } from "@/hooks/useColors";
import { useBottomInset } from "@/hooks/useBottomInset";
import { sortTokensByBalance, type WalletToken } from "@/hooks/useWalletTokens";

interface TokenPickerSheetProps {
  tokens: WalletToken[];
  selectedSymbol: string;
  onSelect: (symbol: string) => void;
}

export const TokenPickerSheet = forwardRef<BottomSheet, TokenPickerSheetProps>(
  ({ tokens, selectedSymbol, onSelect }, ref) => {
    const colors = useColors();
    const bottomInset = useBottomInset();
    // Explicit snap point, so dynamic sizing (on by default) must be off or it adds a second one.
    const snapPoints = useMemo(() => ["65%"], []);
    const sorted = useMemo(() => sortTokensByBalance(tokens), [tokens]);

    const renderItem = ({ item }: { item: WalletToken }) => {
      const isSelected = item.symbol === selectedSymbol;
      return (
        <Pressable
          onPress={() => onSelect(item.symbol)}
          accessibilityRole="button"
          accessibilityLabel={`Send ${item.symbol}`}
          style={{
            flexDirection: "row",
            alignItems: "center",
            minHeight: 56,
            paddingVertical: 8,
            paddingHorizontal: 12,
            marginBottom: 6,
            borderRadius: 16,
            backgroundColor: isSelected ? colors.surface : "transparent",
            borderWidth: isSelected ? 1.5 : 0,
            borderColor: colors.primary,
          }}
        >
          <TokenIcon symbol={item.symbol} icon={item.icon} size={36} />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <ThemedText lightColor="#000000" darkColor={colors.foreground} bold>{item.symbol}</ThemedText>
            <ThemedText lightColor="#000000" darkColor={colors.mutedForeground} variant="sm" numberOfLines={1}>
              {item.name}
            </ThemedText>
          </View>
          <View style={{ alignItems: "flex-end", marginLeft: 8 }}>
            <ThemedText lightColor="#000000" darkColor={colors.foreground}>{item.amount}</ThemedText>
            {item.usd !== undefined && (
              <ThemedText lightColor="#000000" darkColor={colors.mutedForeground} variant="sm">{`$${item.usd}`}</ThemedText>
            )}
          </View>
          {isSelected && (
            <View style={{ marginLeft: 10 }}>
              <Ionicons name="checkmark-circle" size={22} color={colors.primary} />
            </View>
          )}
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
          data={sorted}
          keyExtractor={(item: WalletToken) => item.symbol}
          renderItem={renderItem}
          keyboardShouldPersistTaps="handled"
          ListHeaderComponent={
            <ThemedText lightColor="#000000" darkColor={colors.foreground} bold variant="xl" style={{ marginBottom: 12 }}>
              Select token
            </ThemedText>
          }
          ListEmptyComponent={
            <ThemedText lightColor="#000000" darkColor={colors.mutedForeground} style={{ paddingVertical: 24, textAlign: "center" }}>
              No tokens with a balance available
            </ThemedText>
          }
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: bottomInset + 16 }}
        />
      </BottomSheet>
    );
  },
);

TokenPickerSheet.displayName = "TokenPickerSheet";

export default TokenPickerSheet;
