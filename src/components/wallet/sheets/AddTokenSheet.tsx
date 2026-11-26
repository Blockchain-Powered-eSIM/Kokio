import React, { forwardRef, useState } from "react";
import { View, TextInput } from "react-native";
import BottomSheet, { BottomSheetView, BottomSheetBackdrop } from "@gorhom/bottom-sheet";
import { Ionicons } from "@expo/vector-icons";
import { isAddress } from "viem";

import { ThemedText } from "@/components/ThemedText";
import { useColors } from "@/hooks/useColors";
import { PillButton } from "@/components/ui/PillButton";
import { useToast } from "@/contexts/ToastContext";
import { CustomTokenError, type CustomToken } from "@/hooks/useCustomTokens";
import { logger } from "@/utils/logger";

interface AddTokenSheetProps {
  onAdd: (address: string) => Promise<CustomToken>;
  onAdded?: (token: CustomToken) => void;
}

export const AddTokenSheet = forwardRef<BottomSheet, AddTokenSheetProps>(({ onAdd, onAdded }, ref) => {
  const colors = useColors();
  const { showMessage } = useToast();
  const [contractAddress, setContractAddress] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const trimmed = contractAddress.trim();
  const showInvalid = trimmed.length > 0 && !isAddress(trimmed);
  const canSubmit = isAddress(trimmed) && !isSubmitting;

  const handleAdd = async () => {
    if (!canSubmit) return;
    setIsSubmitting(true);
    try {
      const token = await onAdd(trimmed);
      showMessage(`Added ${token.symbol}`, "info");
      setContractAddress("");
      onAdded?.(token);
    } catch (error) {
      const message = error instanceof CustomTokenError ? error.message : "Failed to add token";
      if (!(error instanceof CustomTokenError)) {
        logger.error("ADD_TOKEN_FAILED", { error });
      }
      showMessage(message, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

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
      <BottomSheetView style={{ padding: 20 }}>
        <ThemedText lightColor="#000000" darkColor={colors.foreground} bold variant="xl">Add a token</ThemedText>

        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 10,
            marginTop: 14,
            padding: 12,
            borderRadius: 14,
            borderWidth: 1,
            borderColor: colors.warning,
            backgroundColor: colors.warning + "22",
          }}
        >
          <Ionicons name="warning-outline" size={20} color={colors.warning} />
          <ThemedText lightColor="#000000" darkColor={colors.foreground} style={{ flex: 1 }}>
            Only add tokens you have verified. Scam tokens can look identical to real ones.
          </ThemedText>
        </View>

        <ThemedText lightColor="#000000" darkColor={colors.mutedForeground} variant="sm" style={{ marginTop: 20, marginBottom: 6 }}>
          Network
        </ThemedText>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingHorizontal: 14,
            minHeight: 50,
            borderRadius: 14,
            backgroundColor: colors.itemBackground,
          }}
        >
          <ThemedText lightColor="#000000" darkColor={colors.foreground}>Base</ThemedText>
          <Ionicons name="lock-closed-outline" size={16} color={colors.mutedForeground} />
        </View>

        <ThemedText lightColor="#000000" darkColor={colors.mutedForeground} variant="sm" style={{ marginTop: 16, marginBottom: 6 }}>
          Token contract address
        </ThemedText>
        <TextInput
          value={contractAddress}
          onChangeText={setContractAddress}
          placeholder="0x..."
          placeholderTextColor={colors.mutedForeground}
          autoCapitalize="none"
          autoCorrect={false}
          style={{
            minHeight: 50,
            paddingHorizontal: 14,
            borderRadius: 14,
            borderWidth: 1,
            borderColor: showInvalid ? colors.destructive : colors.mutedForeground,
            color: colors.foreground,
            backgroundColor: colors.itemBackground,
          }}
        />
        {showInvalid && (
          <ThemedText style={{ color: colors.destructive, marginTop: 6, fontSize: 12.5 }}>
            This is not a valid contract address.
          </ThemedText>
        )}
        <View style={{ marginTop: 24 }}>
          <PillButton variant="solid" disabled={!isAddress(trimmed)} loading={isSubmitting} onPress={handleAdd}>
            Add token
          </PillButton>
        </View>
      </BottomSheetView>
    </BottomSheet>
  );
});

AddTokenSheet.displayName = "AddTokenSheet";

export default AddTokenSheet;
