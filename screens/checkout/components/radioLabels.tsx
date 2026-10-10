import React from "react";
import { ActivityIndicator, Image, StyleSheet, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { useThemedStyles } from "@/hooks/useThemedStyles";
import { useColors } from "@/hooks/useColors";
import { useKokio } from "@/hooks/useKokio";
import { useWalletTokens } from "@/hooks/useWalletTokens";
import type { DeviceWalletPaymentAsset } from "@/constants/checkout.constants";
import type { Palette } from "@/constants/Colors";

const createStyles = (colors: Palette) => StyleSheet.create({
  labelContainer: {
    flex: 1,
    marginLeft: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  textContent: {
    color: colors.foreground,
  },
  creditCards: {
    width: 140,
    height: 24,
    objectFit: "contain",
  },
  logoImage: {
    width: 24,
    height: 24,
    objectFit: "contain",
  },
  walletContainer: {
    flex: 1,
    marginLeft: 8,
  },
  walletRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  selectedToken: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  tokenSymbol: {
    color: colors.foreground,
    fontWeight: "600",
  },
  tokenBalance: {
    color: colors.mutedForeground,
    fontSize: 12,
  },
});

const ESimWallet = ({
  selectedSymbol,
  onOpenTokenPicker,
}: {
  selectedSymbol: DeviceWalletPaymentAsset;
  onOpenTokenPicker: () => void;
}) => {
  const styles = useThemedStyles(createStyles);
  const colors = useColors();
  const { kokio } = useKokio();
  const { tokens, isLoading } = useWalletTokens(kokio.deviceWalletAddress);
  const selectedToken = tokens.find((t) => t.symbol === selectedSymbol);
  const balance = selectedToken?.amount;

  return (
    <View style={styles.walletContainer}>
      <View style={styles.walletRow}>
        <ThemedText style={styles.textContent}>Device Wallet</ThemedText>
        <TouchableOpacity
          onPress={onOpenTokenPicker}
          style={styles.selectedToken}
          accessibilityRole="button"
          accessibilityLabel={`Change payment token, currently ${selectedSymbol}`}
        >
          <View style={{ alignItems: "flex-end" }}>
            <ThemedText style={styles.tokenSymbol}>{selectedSymbol}</ThemedText>
            {balance === undefined && isLoading ? (
              <ActivityIndicator size="small" />
            ) : (
              <ThemedText style={styles.tokenBalance}>
                {balance === undefined ? "Balance unavailable" : `Balance: ${balance}`}
              </ThemedText>
            )}
          </View>
          {/* Icon trails the symbol/balance text, matching Send's token
              selector where the "tap to change" glyph sits at the row's
              trailing edge rather than leading it. */}
          {selectedToken?.icon && <Image source={selectedToken.icon} style={styles.logoImage} />}
          <Ionicons name="chevron-down" size={16} color={colors.mutedForeground} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const CreditCard = () => {
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.labelContainer}>
      <ThemedText style={styles.textContent}>Credit Card</ThemedText>
      <Image
        source={require("@/assets/images/credit-cards.png")}
        style={styles.creditCards}
      />
    </View>
  );
};

const ApplePay = () => {
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.labelContainer}>
      <ThemedText style={styles.textContent}>Apple Pay</ThemedText>
      <Image
        source={require("@/assets/images/apple-logo.png")}
        style={styles.logoImage}
      />
    </View>
  );
};

const ExternalWallet = () => {
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.labelContainer}>
      <ThemedText style={styles.textContent}>External Wallet</ThemedText>
      <Image
        source={require("@/assets/images/usdc.png")}
        style={[styles.logoImage, { marginLeft: 8 }]}
      />
    </View>
  );
};

const ExternalWalletBrowser = () => {
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.labelContainer}>
      <ThemedText style={styles.textContent}>External Wallet (via Moonpay)</ThemedText>
      <Image
        source={require("@/assets/images/usdc.png")}
        style={[styles.logoImage, { marginLeft: 8 }]}
      />
    </View>
  );
};

export { ESimWallet, ApplePay, CreditCard, ExternalWallet, ExternalWalletBrowser };
