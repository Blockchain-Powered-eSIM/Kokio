import React from "react";
import { ActivityIndicator, Image, StyleSheet, TouchableOpacity, View } from "react-native";

import { ThemedText } from "@/components/ThemedText";
import { useThemedStyles } from "@/hooks/useThemedStyles";
import { useKokio } from "@/hooks/useKokio";
import { useWalletTokens } from "@/hooks/useWalletTokens";
import { DEVICE_WALLET_PAYMENT_ASSETS } from "@/constants/checkout.constants";
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
  chipRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 10,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.mutedForeground,
  },
  chipSelected: {
    borderColor: colors.primary,
    borderWidth: 2,
    backgroundColor: colors.surfaceElevated,
  },
  chipIcon: {
    width: 18,
    height: 18,
    objectFit: "contain",
  },
});

const ESimWallet = ({
  isSelected,
  selectedSymbol,
  onSelectSymbol,
}: {
  isSelected: boolean;
  selectedSymbol: DeviceWalletPaymentAsset;
  onSelectSymbol: (symbol: DeviceWalletPaymentAsset) => void;
}) => {
  const styles = useThemedStyles(createStyles);
  const { kokio } = useKokio();
  const { tokens, isLoading } = useWalletTokens(kokio.deviceWalletAddress);
  const selectedToken = tokens.find((t) => t.symbol === selectedSymbol);
  const balance = selectedToken?.amount;

  return (
    <View style={styles.walletContainer}>
      <View style={styles.walletRow}>
        <ThemedText style={styles.textContent}>Device Wallet</ThemedText>
        <View style={styles.selectedToken}>
          {selectedToken?.icon && <Image source={selectedToken.icon} style={styles.logoImage} />}
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
        </View>
      </View>
      {isSelected && (
        <View style={styles.chipRow}>
          {DEVICE_WALLET_PAYMENT_ASSETS.map((symbol) => {
            const icon = tokens.find((t) => t.symbol === symbol)?.icon;
            const active = symbol === selectedSymbol;
            return (
              <TouchableOpacity
                key={symbol}
                onPress={() => onSelectSymbol(symbol)}
                style={[styles.chip, active && styles.chipSelected]}
                accessibilityRole="radio"
                accessibilityState={{ checked: active }}
                accessibilityLabel={`Pay with ${symbol}`}
              >
                {icon && <Image source={icon} style={styles.chipIcon} />}
                <ThemedText style={styles.textContent}>{symbol}</ThemedText>
              </TouchableOpacity>
            );
          })}
        </View>
      )}
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
