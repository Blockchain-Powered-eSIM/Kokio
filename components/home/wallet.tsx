import React from "react";
import { StyleSheet, View, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { useColors } from "@/hooks/useColors";
import { useThemedStyles } from "@/hooks/useThemedStyles";
import { DARK_TOKENS, LIGHT_TOKENS } from "@/constants/Colors";
import { PASSKEY_LABEL } from "@/constants/passkey.constants";
import { ThemedView } from "../ThemedView";
import { ThemedText } from "../ThemedText";

interface WalletProps {
  isWalletAdded: boolean;
  balance?: string;
  onSetupWallet?: () => void;
  onOpenWallet?: () => void;
}

const createStyles = () => StyleSheet.create({
  headingText: {
    fontSize: 16,
    paddingLeft: 20,
    marginBottom: 8,
  },
  card: {
    marginHorizontal: 8,
    borderRadius: 21,
    padding: 18,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "transparent",
  },
  titleLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "transparent",
  },
  primaryButton: {
    width: "100%",
    minHeight: 50,
    borderRadius: 999,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: "700",
  },
});

const Wallet = ({ isWalletAdded, balance, onSetupWallet, onOpenWallet }: WalletProps) => {
  const styles = useThemedStyles(createStyles);
  const colors = useColors();

  return (
    <View style={{ marginVertical: 12 }}>
      <ThemedText style={styles.headingText}>Device Wallet</ThemedText>
      <ThemedView
        lightColor={LIGHT_TOKENS.card}
        darkColor={DARK_TOKENS.surface}
        style={styles.card}
      >
        {isWalletAdded ? (
          <>
            <View style={styles.titleRow}>
              <View style={styles.titleLeft}>
                <Ionicons name="wallet-outline" size={20} color={colors.walletAccent} />
                <ThemedText bold variant="xl">Kokio wallet</ThemedText>
              </View>
              <ThemedText bold variant="xl">${balance}</ThemedText>
            </View>
            <ThemedText
              lightColor={LIGHT_TOKENS.text}
              darkColor={DARK_TOKENS.mutedForeground}
              style={{ marginTop: 6, marginBottom: 14 }}
            >
              Pays for eSIMs and top-ups, signed with {PASSKEY_LABEL}.
            </ThemedText>
            <TouchableOpacity
              style={[styles.primaryButton, { backgroundColor: colors.ctaBackground }]}
              onPress={onOpenWallet}
              accessibilityRole="button"
              accessibilityLabel="Open wallet"
            >
              <ThemedText style={[styles.primaryButtonText, { color: colors.ctaForeground }]}>
                Open wallet
              </ThemedText>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <View style={styles.titleLeft}>
              <Ionicons name="finger-print-outline" size={20} color={colors.walletAccent} />
              <ThemedText bold variant="xl">Add a Kokio wallet</ThemedText>
            </View>
            <ThemedText
              lightColor={LIGHT_TOKENS.text}
              darkColor={DARK_TOKENS.mutedForeground}
              style={{ marginTop: 6, marginBottom: 14 }}
            >
              Optional. Unlocks with {PASSKEY_LABEL}, no seed phrase. Your card keeps working.
            </ThemedText>
            <TouchableOpacity
              style={[styles.primaryButton, { backgroundColor: colors.ctaBackground }]}
              onPress={onSetupWallet}
              accessibilityRole="button"
              accessibilityLabel="Create wallet"
            >
              <ThemedText style={[styles.primaryButtonText, { color: colors.ctaForeground }]}>
                Create wallet
              </ThemedText>
            </TouchableOpacity>
          </>
        )}
      </ThemedView>
    </View>
  );
};

export default Wallet;
