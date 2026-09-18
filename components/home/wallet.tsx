import React from "react";
import { StyleSheet, View, TouchableOpacity, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import { useColors } from "@/hooks/useColors";
import { useThemedStyles } from "@/hooks/useThemedStyles";
import { useTheme } from "@/contexts/ThemeContext";
import { DARK_TOKENS, LIGHT_TOKENS } from "@/constants/Colors";
import { PASSKEY_LABEL } from "@/constants/passkey.constants";
import { ThemedView } from "../ThemedView";
import { ThemedText } from "../ThemedText";

interface WalletProps {
  isWalletAdded: boolean;
  balance?: string;
  isBalanceLoading?: boolean;
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
    fontSize: 18,
    fontWeight: "700",
  },
  descriptionRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
    marginTop: 6,
    marginBottom: 14,
  },
});

const Wallet = ({ isWalletAdded, balance, isBalanceLoading, onSetupWallet, onOpenWallet }: WalletProps) => {
  const styles = useThemedStyles(createStyles);
  const colors = useColors();
  const router = useRouter();
  const { isDark } = useTheme();
  // walletAccent is teal in light mode (fine on a white card) but yellow in
  // dark mode, which now matches the card's own yellow background exactly -
  // an icon/spinner in that color would be invisible. Fall back to
  // cardForeground (black) for on-card icons specifically in dark mode only.
  const iconOnCardColor = isDark ? colors.cardForeground : colors.walletAccent;

  return (
    <View style={{ marginVertical: 12 }}>
      <ThemedText style={styles.headingText}>Wallet</ThemedText>
      <ThemedView
        lightColor={LIGHT_TOKENS.card}
        darkColor={DARK_TOKENS.card}
        style={styles.card}
      >
        {isWalletAdded ? (
          <>
            <View style={styles.titleRow}>
              <View style={styles.titleLeft}>
                <Ionicons name="wallet-outline" size={20} color={iconOnCardColor} />
                <ThemedText
                  bold
                  variant="xl"
                  lightColor={LIGHT_TOKENS.cardForeground}
                  darkColor={DARK_TOKENS.cardForeground}
                >
                  Kokio wallet
                </ThemedText>
              </View>
              {isBalanceLoading ? (
                <ActivityIndicator size="small" color={iconOnCardColor} />
              ) : (
                <ThemedText
                  bold
                  variant="xl"
                  lightColor={LIGHT_TOKENS.cardForeground}
                  darkColor={DARK_TOKENS.cardForeground}
                >
                  {balance === undefined ? "—" : `$${balance}`}
                </ThemedText>
              )}
            </View>
            <ThemedText
              lightColor={LIGHT_TOKENS.cardForeground}
              darkColor={DARK_TOKENS.cardForeground}
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
              <Ionicons name="finger-print-outline" size={20} color={iconOnCardColor} />
              <ThemedText
                bold
                variant="xl"
                lightColor={LIGHT_TOKENS.cardForeground}
                darkColor={DARK_TOKENS.cardForeground}
              >
                Add a Kokio wallet
              </ThemedText>
            </View>
            <View style={styles.descriptionRow}>
              <ThemedText
                lightColor={LIGHT_TOKENS.cardForeground}
                darkColor={DARK_TOKENS.cardForeground}
                style={{ flex: 1 }}
              >
                Unlock with {PASSKEY_LABEL}. Pay and top up with stablecoins, and travel freely.
              </ThemedText>
              <TouchableOpacity
                onPress={() => router.push("/(tabs)/(wallet)" as any)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityRole="button"
                accessibilityLabel="Learn more about the Kokio wallet"
              >
                <Ionicons name="bulb-outline" size={18} color={iconOnCardColor} />
              </TouchableOpacity>
            </View>
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
