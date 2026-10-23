import React from "react";
import { ActivityIndicator, Image, StyleSheet, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { useThemedStyles } from "@/hooks/useThemedStyles";
import { useColors } from "@/hooks/useColors";
import { useKokio } from "@/hooks/useKokio";
import { useWalletTokens, truncateDecimals } from "@/hooks/useWalletTokens";
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
  walletIconsRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  walletIcon: {
    width: 22,
    height: 22,
    borderRadius: 11,
    objectFit: "contain",
    backgroundColor: colors.card,
    borderWidth: 1.5,
  },
  walletIconOverlap: {
    marginLeft: -8,
  },
  walletIconsMore: {
    marginLeft: 5,
    fontSize: 15,
    fontWeight: "700",
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
    <View style={styles.labelContainer}>
      <ThemedText style={styles.textContent}>Kokio Wallet</ThemedText>
      <TouchableOpacity
        onPress={onOpenTokenPicker}
        style={styles.selectedToken}
        accessibilityRole="button"
        accessibilityLabel={`Change payment token, currently ${selectedSymbol}`}
      >
        {balance === undefined && isLoading ? (
          <ActivityIndicator size="small" />
        ) : (
          <ThemedText style={styles.tokenBalance}>
            {balance === undefined ? "—" : truncateDecimals(balance, 2)}
          </ThemedText>
        )}
        <ThemedText style={styles.tokenSymbol}>{selectedSymbol}</ThemedText>
        {selectedToken?.icon && <Image source={selectedToken.icon} style={styles.logoImage} />}
        <Ionicons name="chevron-down" size={16} color={colors.mutedForeground} />
      </TouchableOpacity>
    </View>
  );
};

const CreditCard = () => {
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.labelContainer}>
      <ThemedText style={styles.textContent}>Credit/Debit Card</ThemedText>
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

const OTHER_WALLET_ICONS = [
  require("@/assets/images/wallets/bitcoin.png"),
  require("@/assets/images/wallets/ethereum.png"),
  require("@/assets/images/wallets/solana.png"),
];

const ExternalWalletBrowser = () => {
  const styles = useThemedStyles(createStyles);
  const colors = useColors();
  return (
    <View style={styles.labelContainer}>
      <ThemedText style={styles.textContent}>Other crypto wallet</ThemedText>
      <View style={styles.walletIconsRow}>
        {OTHER_WALLET_ICONS.map((src, index) => (
          <Image
            key={index}
            source={src}
            style={[
              styles.walletIcon,
              { borderColor: colors.card },
              index > 0 && styles.walletIconOverlap,
            ]}
          />
        ))}
        <ThemedText style={[styles.walletIconsMore, { color: colors.mutedForeground }]}>...</ThemedText>
      </View>
    </View>
  );
};

export { ESimWallet, ApplePay, CreditCard, ExternalWallet, ExternalWalletBrowser };
